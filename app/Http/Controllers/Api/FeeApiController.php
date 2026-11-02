<?php

namespace App\Http\Controllers\Api;

use App\Models\FeeInvoice;
use App\Support\DocumentSlipBuilder;
use App\Support\RoleDataScope;
use App\Models\FeePayment;
use App\Models\PaymentProof;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeeApiController extends BaseApiController
{
    public function invoices(Request $request): JsonResponse
    {
        $query = FeeInvoice::with('student')
            ->where('school_id', $this->schoolId())
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->class_id, fn ($q, $c) => $q->whereHas('student', fn ($q) => $q->where('school_class_id', $c)))
            ->when($request->from, fn ($q, $d) => $q->whereDate('due_date', '>=', $d))
            ->when($request->to, fn ($q, $d) => $q->whereDate('due_date', '<=', $d))
            ->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('invoice_no', 'like', "%{$s}%")
                    ->orWhereHas('student', fn ($q) => $q->where('name', 'like', "%{$s}%"));
            }))
            ->when($request->name, fn ($q, $s) => $q->whereHas('student', fn ($q) => $q->where('name', 'like', "%{$s}%")))
            ->latest();

        RoleDataScope::scopeFeeInvoices($query);

        $paginated = $this->paginated($query);
        $paginated->getCollection()->transform(fn (FeeInvoice $inv) => [
            'id' => $inv->id,
            'invoice_no' => $inv->invoice_no,
            'amount' => $inv->amount,
            'paid_amount' => $inv->paid_amount,
            'discount' => $inv->discount,
            'due_date' => $inv->due_date?->format('Y-m-d'),
            'paid_date' => $inv->paid_date?->format('Y-m-d'),
            'status' => $inv->status,
            'notes' => $inv->notes,
            'student_id' => $inv->student_id,
            'student' => $inv->student?->name ?? '—',
        ]);

        return $this->success($paginated);
    }

    public function storeInvoice(Request $request): JsonResponse
    {
        $data = $request->validate([
            'student_id' => 'required|exists:students,id',
            'invoice_no' => 'nullable|string|max:50',
            'amount' => 'required|numeric|min:0.01',
            'paid_amount' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'due_date' => 'required|date',
            'status' => 'in:pending,paid,partial,overdue,cancelled',
            'notes' => 'nullable|string',
        ]);

        $student = Student::where('school_id', $this->schoolId())->findOrFail($data['student_id']);
        $data['school_id'] = $this->schoolId();
        $data['paid_amount'] = $data['paid_amount'] ?? 0;
        $data['discount'] = $data['discount'] ?? 0;
        $data['invoice_no'] = $data['invoice_no'] ?? 'INV-' . strtoupper(uniqid());
        $data['status'] = $data['status'] ?? 'pending';

        // Duplicate invoice_no check within school
        if (FeeInvoice::where('school_id', $this->schoolId())
            ->where('invoice_no', $data['invoice_no'])
            ->exists()) {
            return $this->error('Invoice number already exists. Please use a different number.', 422);
        }

        $invoice = FeeInvoice::create($data);

        return $this->success($invoice, 'Invoice created', 201);
    }

    public function updateInvoice(Request $request, FeeInvoice $feeInvoice): JsonResponse
    {
        abort_unless($feeInvoice->school_id === $this->schoolId(), 403);
        $data = $request->validate([
            'student_id' => 'sometimes|exists:students,id',
            'invoice_no' => 'nullable|string|max:50',
            'amount' => 'sometimes|numeric|min:0.01',
            'paid_amount' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'due_date' => 'sometimes|date',
            'status' => 'in:pending,paid,partial,overdue,cancelled',
            'notes' => 'nullable|string',
        ]);

        if (! empty($data['invoice_no'])) {
            $duplicate = FeeInvoice::where('school_id', $this->schoolId())
                ->where('invoice_no', $data['invoice_no'])
                ->where('id', '!=', $feeInvoice->id)
                ->exists();
            if ($duplicate) {
                return $this->error('Invoice number already exists.', 422);
            }
        }

        $feeInvoice->update($data);

        return $this->success($feeInvoice, 'Invoice updated');
    }

    public function destroyInvoice(FeeInvoice $feeInvoice): JsonResponse
    {
        abort_unless($feeInvoice->school_id === $this->schoolId(), 403);
        abort_if(FeePayment::where('fee_invoice_id', $feeInvoice->id)->exists(), 422, 'Cannot delete invoice with recorded payments.');
        $feeInvoice->delete();

        return $this->success(null, 'Invoice deleted');
    }

    public function invoiceSlip(FeeInvoice $feeInvoice): JsonResponse
    {
        abort_unless($feeInvoice->school_id === $this->schoolId(), 403);
        RoleDataScope::assertCanAccessStudent($feeInvoice->student_id);

        return $this->success(DocumentSlipBuilder::feeInvoice($feeInvoice));
    }

    public function payments(Request $request): JsonResponse
    {
        $query = FeePayment::with(['student.schoolClass'])
            ->where('school_id', $this->schoolId())
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->class_id, fn ($q, $c) => $q->whereHas('student', fn ($q) => $q->where('school_class_id', $c)))
            ->when($request->from, fn ($q, $d) => $q->whereDate('paid_at', '>=', $d))
            ->when($request->to, fn ($q, $d) => $q->whereDate('paid_at', '<=', $d))
            ->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('receipt_no', 'like', "%{$s}%")
                    ->orWhere('month_label', 'like', "%{$s}%")
                    ->orWhereHas('student', fn ($q) => $q->where('name', 'like', "%{$s}%"));
            }))
            ->when($request->name, fn ($q, $s) => $q->whereHas('student', fn ($q) => $q->where('name', 'like', "%{$s}%")))
            ->latest('paid_at')
            ->latest();

        RoleDataScope::scopeFeePayments($query);

        $paginated = $this->paginated($query);
        $paginated->getCollection()->transform(fn (FeePayment $p) => [
            'id' => $p->id,
            'receipt_no' => $p->receipt_no ?? 'RCP-' . str_pad((string) $p->id, 5, '0', STR_PAD_LEFT),
            'student_id' => $p->student_id,
            'student' => $p->student?->name ?? '—',
            'class' => $p->student?->schoolClass?->name ?? '—',
            'amount' => $p->amount,
            'payment_method' => $p->payment_method,
            'month_label' => $p->month_label,
            'paid_at' => $p->paid_at?->format('Y-m-d'),
            'status' => $p->status,
        ]);

        return $this->success($paginated);
    }

    public function paymentSlip(FeePayment $feePayment): JsonResponse
    {
        abort_unless($feePayment->school_id === $this->schoolId(), 403);
        RoleDataScope::assertCanAccessStudent($feePayment->student_id);

        return $this->success(DocumentSlipBuilder::feeReceipt($feePayment));
    }

    public function paymentProofs(Request $request): JsonResponse
    {
        $query = PaymentProof::with(['student', 'reviewer'])
            ->where('school_id', $this->schoolId())
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->from, fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($request->to, fn ($q, $d) => $q->whereDate('created_at', '<=', $d))
            ->when($request->name, fn ($q, $s) => $q->whereHas('student', fn ($q) => $q->where('name', 'like', "%{$s}%")))
            ->latest();

        return $this->success($this->paginated($query));
    }

    public function approvePayment(PaymentProof $proof): JsonResponse
    {
        abort_unless($proof->school_id === $this->schoolId(), 403);
        $proof->update([
            'status' => 'approved',
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
        ]);
        if ($proof->fee_invoice_id) {
            $invoice = $proof->feeInvoice;
            $invoice->update([
                'paid_amount' => $invoice->paid_amount + $proof->amount,
                'status' => ($invoice->paid_amount + $proof->amount) >= $invoice->amount ? 'paid' : 'partial',
                'paid_date' => now(),
            ]);
        }
        return $this->success($proof, 'Payment approved');
    }

    public function rejectPayment(Request $request, PaymentProof $proof): JsonResponse
    {
        abort_unless($proof->school_id === $this->schoolId(), 403);
        $proof->update([
            'status' => 'rejected',
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
            'review_notes' => $request->notes,
        ]);
        return $this->success($proof, 'Payment rejected');
    }

    public function collect(Request $request): JsonResponse
    {
        $data = $request->validate([
            'student_id' => 'required|exists:students,id',
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|in:cash,bank_transfer,card,online',
            'payment_date' => 'required|date',
            'fee_invoice_id' => 'nullable|exists:fee_invoices,id',
            'month_label' => 'nullable|string|max:100',
        ]);

        $student = Student::where('school_id', $this->schoolId())
            ->findOrFail($data['student_id']);

        RoleDataScope::assertCanAccessStudent($student->id);

        $paidAt = $data['payment_date'];
        $monthLabel = $data['month_label'] ?? ('School Fee — ' . date('F Y', strtotime($paidAt)));

        $payment = \Illuminate\Support\Facades\DB::transaction(function () use ($data, $student, $paidAt, $monthLabel) {
            $payment = FeePayment::create([
                'school_id' => $this->schoolId(),
                'student_id' => $student->id,
                'fee_invoice_id' => $data['fee_invoice_id'] ?? null,
                'receipt_no' => 'RCP-' . strtoupper(uniqid()),
                'amount' => $data['amount'],
                'payment_method' => $data['payment_method'],
                'status' => 'paid',
                'due_date' => $paidAt,
                'paid_at' => $paidAt,
                'month_label' => $monthLabel,
            ]);

            if (! empty($data['fee_invoice_id'])) {
                $invoice = FeeInvoice::where('school_id', $this->schoolId())->find($data['fee_invoice_id']);
                if ($invoice) {
                    $newPaid = (float) $invoice->paid_amount + (float) $data['amount'];
                    $invoice->update([
                        'paid_amount' => $newPaid,
                        'status' => $newPaid >= (float) $invoice->amount ? 'paid' : 'partial',
                        'paid_date' => $paidAt,
                    ]);
                }
            }

            return $payment;
        });

        $payment->load(['student.schoolClass', 'feeInvoice']);

        return $this->success([
            'payment' => [
                'id' => $payment->id,
                'receipt_no' => $payment->receipt_no,
                'amount' => $payment->amount,
                'status' => $payment->status,
            ],
            'slip' => DocumentSlipBuilder::feeReceipt($payment),
        ], 'Fee collected', 201);
    }
}

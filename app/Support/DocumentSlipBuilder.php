<?php



namespace App\Support;



use App\Models\FeeInvoice;

use App\Models\FeePayment;

use App\Models\School;

use App\Models\StaffSalary;

use App\Models\Student;

use App\Models\Teacher;



class DocumentSlipBuilder

{

    /** @var array<int, array{school_name: string, school_address: string, school_phone: string}> */

    private static array $schoolHeaderCache = [];



    public static function schoolHeader(int $schoolId): array

    {

        if (isset(self::$schoolHeaderCache[$schoolId])) {

            return self::$schoolHeaderCache[$schoolId];

        }



        $school = School::find($schoolId);



        return self::$schoolHeaderCache[$schoolId] = [

            'school_name' => $school?->name ?? 'School',

            'school_address' => $school?->address ?? '',

            'school_phone' => $school?->phone ?? '',

            'school_email' => $school?->email ?? '',

            'school_logo' => school_logo_url($schoolId),

            'branding' => SlipBranding::resolve($schoolId),

        ];

    }



    public static function feeInvoice(FeeInvoice $invoice): array

    {

        $invoice->loadMissing(['student.schoolClass']);

        $student = $invoice->student;

        $header = self::schoolHeader($invoice->school_id);

        $balance = max(0, (float) $invoice->amount - (float) $invoice->paid_amount - (float) $invoice->discount);



        return array_merge($header, [

            'type' => 'fee_invoice',

            'title' => 'School Fee Invoice',

            'document_no' => $invoice->invoice_no,

            'date' => $invoice->due_date?->format('d-M-Y') ?? now()->format('d-M-Y'),

            'party_label' => 'Student',

            'party_name' => $student?->name ?? '—',

            'party_meta' => self::studentMeta($student),

            'party_id' => self::studentId($student),

            'class_name' => $student?->schoolClass?->name ?? '—',

            'line_items' => [

                ['no' => '01', 'description' => 'Tuition / School Fee', 'amount' => self::money($invoice->amount)],

                ['no' => '02', 'description' => 'Discount', 'amount' => self::money($invoice->discount)],

                ['no' => '03', 'description' => 'Paid Amount', 'amount' => self::money($invoice->paid_amount)],

            ],

            'rows' => [

                ['label' => 'Invoice Amount', 'value' => self::money($invoice->amount)],

                ['label' => 'Discount', 'value' => self::money($invoice->discount)],

                ['label' => 'Paid Amount', 'value' => self::money($invoice->paid_amount)],

                ['label' => 'Balance Due', 'value' => self::money($balance)],

                ['label' => 'Status', 'value' => ucfirst($invoice->status)],

            ],

            'subtotal' => self::money($invoice->amount),

            'total_label' => 'Balance Due',

            'total_value' => self::money($balance),

            'notes' => $invoice->notes,

            'footer' => 'Please pay before the due date. This is a computer-generated invoice.',

            'qr_payload' => self::qrPayload('fee_invoice', $invoice->invoice_no, $student?->id, $balance, $invoice->due_date?->format('Y-m-d')),

        ]);

    }



    public static function feeReceipt(FeePayment $payment): array

    {

        $payment->loadMissing(['student.schoolClass', 'feeInvoice']);

        $student = $payment->student;

        $header = self::schoolHeader($payment->school_id);

        $method = $payment->payment_method

            ? str_replace('_', ' ', ucfirst($payment->payment_method))

            : 'Cash';

        $description = $payment->month_label ?? 'School Fee';



        return array_merge($header, [

            'type' => 'fee_receipt',

            'title' => 'School Fee Receipt',

            'document_no' => $payment->receipt_no ?? 'S-RCPT-' . str_pad((string) $payment->id, 3, '0', STR_PAD_LEFT),

            'date' => $payment->paid_at?->format('d-M-Y') ?? now()->format('d-M-Y'),

            'party_label' => 'Student',

            'party_name' => $student?->name ?? '—',

            'party_meta' => self::studentMeta($student),

            'party_id' => self::studentId($student),

            'class_name' => $student?->schoolClass?->name ?? '—',

            'line_items' => [

                ['no' => '01', 'description' => $description, 'amount' => self::money($payment->amount)],

                ['no' => '02', 'description' => 'Payment Method — ' . $method, 'amount' => '—'],

                ['no' => '03', 'description' => 'Invoice Ref — ' . ($payment->feeInvoice?->invoice_no ?? '—'), 'amount' => '—'],

            ],

            'rows' => [

                ['label' => 'Payment For', 'value' => $description],

                ['label' => 'Payment Method', 'value' => $method],

                ['label' => 'Invoice Ref', 'value' => $payment->feeInvoice?->invoice_no ?? '—'],

                ['label' => 'Status', 'value' => ucfirst($payment->status)],

            ],

            'subtotal' => self::money($payment->amount),

            'total_label' => 'Amount Received',

            'total_value' => self::money($payment->amount),

            'footer' => 'Thank you for your payment. Keep this receipt for your records.',

            'qr_payload' => self::qrPayload('fee_receipt', $payment->receipt_no ?? 'RCP-'.$payment->id, $student?->id, (float) $payment->amount, $payment->paid_at?->format('Y-m-d')),

        ]);

    }



    public static function salarySlip(StaffSalary $salary): array

    {

        $header = self::schoolHeader($salary->school_id);

        $period = $salary->month . ' ' . $salary->year;



        return array_merge($header, [

            'type' => 'salary_slip',

            'title' => 'Salary Slip',

            'document_no' => 'SAL-' . str_pad((string) $salary->id, 5, '0', STR_PAD_LEFT),

            'date' => $salary->paid_date?->format('d-M-Y') ?? now()->format('d-M-Y'),

            'party_label' => 'Employee',

            'party_name' => $salary->employee_name,

            'party_meta' => $period,

            'party_id' => 'EMP-' . str_pad((string) $salary->id, 3, '0', STR_PAD_LEFT),

            'class_name' => $period,

            'line_items' => [

                ['no' => '01', 'description' => 'Basic Salary', 'amount' => self::money($salary->basic_salary)],

                ['no' => '02', 'description' => 'Allowances', 'amount' => self::money($salary->allowances)],

                ['no' => '03', 'description' => 'Deductions', 'amount' => self::money($salary->deductions)],

            ],

            'rows' => [

                ['label' => 'Basic Salary', 'value' => self::money($salary->basic_salary)],

                ['label' => 'Allowances', 'value' => self::money($salary->allowances)],

                ['label' => 'Deductions', 'value' => self::money($salary->deductions)],

                ['label' => 'Status', 'value' => ucfirst($salary->status)],

            ],

            'subtotal' => self::money($salary->basic_salary + $salary->allowances),

            'total_label' => 'Net Salary',

            'total_value' => self::money($salary->net_salary),

            'footer' => 'This is an official salary slip for staff/teachers.',

            'qr_payload' => self::qrPayload('salary_slip', 'SAL-'.str_pad((string) $salary->id, 5, '0', STR_PAD_LEFT), $salary->id, (float) $salary->net_salary, $salary->paid_date?->format('Y-m-d')),

        ]);

    }



    public static function admissionSlip(Student $student): array

    {

        $student->loadMissing('schoolClass');

        $header = self::schoolHeader($student->school_id);

        $className = $student->schoolClass?->name ?? '—';



        return array_merge($header, [

            'type' => 'admission_slip',

            'title' => 'Admission Slip',

            'document_no' => 'ADM-' . str_pad((string) $student->id, 3, '0', STR_PAD_LEFT),

            'date' => ($student->admission_date ?? $student->created_at)?->format('d-M-Y') ?? now()->format('d-M-Y'),

            'party_label' => 'Student',

            'party_name' => $student->name,

            'party_meta' => self::studentMeta($student),

            'party_id' => self::studentId($student),

            'class_name' => $className,

            'line_items' => [

                ['no' => '01', 'description' => 'Admission to ' . $className, 'amount' => '—'],

                ['no' => '02', 'description' => 'Roll No — ' . ($student->roll_no ?? '—'), 'amount' => '—'],

                ['no' => '03', 'description' => 'Gender — ' . ucfirst($student->gender ?? '—'), 'amount' => '—'],

            ],

            'rows' => [

                ['label' => 'Father Name', 'value' => $student->father_name ?? '—'],

                ['label' => 'GR No', 'value' => $student->gr_no ?? '—'],

                ['label' => 'Class', 'value' => $className],

                ['label' => 'Section', 'value' => $student->section ?? '—'],

                ['label' => 'Roll No', 'value' => $student->roll_no ?? '—'],

                ['label' => 'B-Form / CNIC', 'value' => $student->b_form_no ?? '—'],

                ['label' => 'Admission Date', 'value' => ($student->admission_date ?? $student->created_at)?->format('d M Y') ?? '—'],

                ['label' => 'Status', 'value' => ucfirst($student->status)],

            ],

            'subtotal' => '—',

            'total_label' => 'Admission Status',

            'total_value' => ucfirst($student->status),

            'footer' => 'Welcome to our school. Please keep this admission slip for your records.',

            'qr_payload' => self::qrPayload('admission_slip', 'ADM-'.str_pad((string) $student->id, 3, '0', STR_PAD_LEFT), $student->id, null, ($student->admission_date ?? $student->created_at)?->format('Y-m-d')),

        ]);

    }



    public static function employeeSlip(Teacher $teacher): array

    {

        $teacher->loadMissing('subjects');

        $header = self::schoolHeader($teacher->school_id);

        $subjects = $teacher->subjects->pluck('name')->join(', ') ?: '—';



        return array_merge($header, [

            'type' => 'employee_slip',

            'title' => 'Employee Slip',

            'document_no' => $teacher->employee_id ?? 'EMP-' . str_pad((string) $teacher->id, 3, '0', STR_PAD_LEFT),

            'date' => ($teacher->joining_date ?? $teacher->created_at)?->format('d-M-Y') ?? now()->format('d-M-Y'),

            'party_label' => 'Employee',

            'party_name' => $teacher->name,

            'party_meta' => $teacher->employee_id ?? '—',

            'party_id' => $teacher->employee_id ?? 'EMP-' . str_pad((string) $teacher->id, 3, '0', STR_PAD_LEFT),

            'class_name' => $subjects,

            'line_items' => [

                ['no' => '01', 'description' => 'Employee ID — ' . ($teacher->employee_id ?? '—'), 'amount' => '—'],

                ['no' => '02', 'description' => 'Subjects — ' . $subjects, 'amount' => '—'],

                ['no' => '03', 'description' => 'Qualification — ' . ($teacher->qualification ?? '—'), 'amount' => '—'],

            ],

            'rows' => [

                ['label' => 'Father Name', 'value' => $teacher->father_name ?? '—'],

                ['label' => 'CNIC', 'value' => $teacher->cnic ?? '—'],

                ['label' => 'Employee ID', 'value' => $teacher->employee_id ?? '—'],

                ['label' => 'Email', 'value' => $teacher->email ?? '—'],

                ['label' => 'Phone', 'value' => $teacher->phone ?? '—'],

                ['label' => 'Status', 'value' => ucfirst($teacher->status)],

            ],

            'subtotal' => self::money($teacher->salary ?? 0),

            'total_label' => 'Monthly Salary',

            'total_value' => self::money($teacher->salary ?? 0),

            'footer' => 'This is an official employee record slip for school staff.',

            'qr_payload' => self::qrPayload('employee_slip', $teacher->employee_id ?? 'EMP-'.str_pad((string) $teacher->id, 3, '0', STR_PAD_LEFT), $teacher->id, (float) ($teacher->salary ?? 0), ($teacher->joining_date ?? $teacher->created_at)?->format('Y-m-d')),

        ]);

    }



    private static function studentId(?Student $student): string

    {

        if (! $student) {

            return '—';

        }



        return 'ST-' . str_pad((string) $student->id, 3, '0', STR_PAD_LEFT);

    }



    private static function studentMeta(?Student $student): string

    {

        if (! $student) {

            return '';

        }



        $class = $student->schoolClass?->name ?? '—';

        $roll = $student->roll_no ?? '—';

        $father = $student->father_name ?? '—';

        $gr = $student->gr_no ?? '—';



        return "Father: {$father} | GR: {$gr} | Roll: {$roll} | Class: {$class}";

    }



    private static function money(mixed $amount): string

    {

        return 'Rs. ' . number_format((float) $amount, 2);

    }



    private static function qrPayload(string $type, string $docNo, ?int $entityId, ?float $amount, ?string $date): string

    {

        return json_encode([

            'type' => $type,

            'no' => $docNo,

            'id' => $entityId,

            'amount' => $amount,

            'date' => $date,

            'school' => brand_name(),

        ], JSON_UNESCAPED_UNICODE);

    }

}


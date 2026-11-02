<?php



namespace App\Http\Controllers\Api;



use App\AccountStatus;

use App\ApprovalStatus;

use App\Models\User;

use App\Support\UserAccountManager;

use Illuminate\Http\JsonResponse;

use Illuminate\Http\Request;

use Illuminate\Support\Facades\Hash;



class ParentApiController extends BaseApiController

{

    public function index(Request $request): JsonResponse

    {

        $query = User::role('parent')

            ->where('school_id', $this->schoolId())

            ->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {

                $q->where('name', 'like', "%{$s}%")

                    ->orWhere('email', 'like', "%{$s}%")

                    ->orWhere('phone', 'like', "%{$s}%");

            }))

            ->when($request->name, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))

            ->when($request->login_status === 'blocked', fn ($q) => $q->whereIn('account_status', [AccountStatus::SUSPENDED, AccountStatus::BANNED]))

            ->when($request->login_status === 'active', fn ($q) => $q->where('account_status', AccountStatus::ACTIVE))

            ->when($request->from, fn ($q, $d) => $q->whereDate('created_at', '>=', $d))

            ->when($request->to, fn ($q, $d) => $q->whereDate('created_at', '<=', $d))

            ->withCount('children')

            ->latest();



        $paginated = $this->paginated($query);

        $paginated->getCollection()->transform(fn (User $u) => [

            'id' => $u->id,

            'name' => $u->name,

            'email' => $u->email,

            'phone' => $u->phone,

            'children_count' => $u->children_count,

            'status' => $u->account_status,

            'login_status' => UserAccountManager::loginStatusLabel($u),

        ]);



        return $this->success($paginated);

    }



    public function store(Request $request): JsonResponse

    {

        $data = $request->validate([

            'name' => 'required|string|max:255',

            'email' => 'required|email|unique:users,email',

            'phone' => 'nullable|string',

            'password' => 'required|string|min:8',

        ]);



        $user = User::create([

            'school_id' => $this->schoolId(),

            'name' => $data['name'],

            'email' => $data['email'],

            'phone' => $data['phone'] ?? null,

            'password' => Hash::make($data['password']),

            'email_verified_at' => now(),

            'account_status' => AccountStatus::ACTIVE,

            'approval_status' => ApprovalStatus::APPROVED,

            'fee_cleared' => true,

            'approved_at' => now(),

            'approved_by' => auth()->id(),

        ]);



        $user->assignRole('parent');



        return $this->success($user, 'Parent created', 201);

    }



    public function update(Request $request, User $user): JsonResponse

    {

        abort_unless($user->school_id === $this->schoolId() && $user->hasRole('parent'), 403);



        $data = $request->validate([

            'name' => 'sometimes|string|max:255',

            'email' => 'sometimes|email|unique:users,email,' . $user->id,

            'phone' => 'nullable|string',

            'password' => 'nullable|string|min:8',

        ]);



        if (! empty($data['password'])) {

            $data['password'] = Hash::make($data['password']);

        } else {

            unset($data['password']);

        }



        $user->update($data);



        return $this->success($user, 'Parent updated');

    }



    public function toggleBlock(User $user): JsonResponse

    {

        abort_unless($user->school_id === $this->schoolId() && $user->hasRole('parent'), 403);



        if (UserAccountManager::isBlocked($user)) {

            UserAccountManager::unblock($user);

            $message = 'Parent unblocked — login enabled';

        } else {

            UserAccountManager::block($user);

            $message = 'Parent blocked — login disabled';

        }



        return $this->success([

            'login_status' => UserAccountManager::loginStatusLabel($user->fresh()),

        ], $message);

    }

    public function destroy(User $user): JsonResponse

    {

        abort_unless($user->school_id === $this->schoolId() && $user->hasRole('parent'), 403);

        abort_if($user->children()->exists(), 422, 'Cannot delete parent with linked students.');



        $user->tokens()->delete();

        $user->delete();



        return $this->success(null, 'Parent deleted');

    }

}


<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Services\Registration\RegistrationOrchestrator;
use Exception;

class RegisterController extends Controller
{
    public function __construct(
        private RegistrationOrchestrator $orchestrator
    ) {}

    public function store(RegisterRequest $request)
    {
        try {
            $result = $this->orchestrator->registerCompany($request->validated());

            return response()->json([
                'message' => 'Verification code sent',
                'status' => 'pending_verification'
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'message' => 'Registration failed.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

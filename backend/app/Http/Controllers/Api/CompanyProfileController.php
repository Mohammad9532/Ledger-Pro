<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCompanyProfileRequest;
use App\Services\Company\CompanyProfileService;
use Illuminate\Http\JsonResponse;

class CompanyProfileController extends Controller
{
    public function __construct(
        private CompanyProfileService $profileService
    ) {}
    public function update(UpdateCompanyProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $masterCompany = $user->company;

        $profile = $this->profileService->updateProfile(
            $masterCompany,
            $request->validated(),
            $request->file('logo')
        );

        return response()->json([
            'message' => 'Company profile updated successfully.',
            'profile' => $profile
        ]);
    }
}

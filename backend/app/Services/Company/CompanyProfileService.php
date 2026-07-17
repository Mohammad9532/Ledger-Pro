<?php

namespace App\Services\Company;

use App\Models\Master\Company;
use App\Models\Tenant\CompanyProfile;
use App\Events\CompanyOnboardingCompleted;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class CompanyProfileService
{
    /**
     * Update or create the company profile and handle onboarding logic.
     */
    public function updateProfile(Company $masterCompany, array $data, ?UploadedFile $logo = null): CompanyProfile
    {
        return DB::connection('tenant')->transaction(function () use ($masterCompany, $data, $logo) {
            
            // Handle logo replacement if uploaded
            if ($logo) {
                // Delete old logo if it exists (assuming it's managed via standard storage methods later)
                $path = $logo->storeAs(
                    'companies/' . $masterCompany->company_uuid,
                    'logo.' . $logo->getClientOriginalExtension(),
                    'public'
                );
                $data['logo_path'] = $path;
            }

            // Update or Create the Tenant Company Profile
            $profile = CompanyProfile::first();
            if ($profile) {
                $profile->update($data);
            } else {
                $profile = CompanyProfile::create($data);
            }

            // Sync allowed master fields
            $masterUpdates = [];
            if ($masterCompany->company_name !== $data['company_name']) {
                $masterUpdates['company_name'] = $data['company_name'];
            }

            // Detect if this is the first time onboarding is completed
            $isOnboardingFirstTime = is_null($masterCompany->onboarding_completed_at);
            if ($isOnboardingFirstTime) {
                $masterUpdates['onboarding_completed_at'] = now();
            }

            if (!empty($masterUpdates)) {
                $masterCompany->update($masterUpdates);
            }

            // Fire event if onboarding was just completed
            if ($isOnboardingFirstTime) {
                CompanyOnboardingCompleted::dispatch($masterCompany, $profile);
            }

            return $profile;
        });
    }
}

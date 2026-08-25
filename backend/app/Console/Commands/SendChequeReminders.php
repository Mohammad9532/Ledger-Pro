<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Master\Company;
use App\Models\Master\User;
use App\Models\Tenant\CompanyProfile;
use App\Models\Tenant\ChequeReminder;
use App\Models\Tenant\ChequeReminderSend;
use App\Jobs\ProcessTenantChequeRemindersJob;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SendChequeReminders extends Command
{
    protected $signature = 'app:cheques-send-reminders';
    protected $description = 'Iterate through tenants and send queued cheque reminders';

    public function handle()
    {
        $companies = Company::where('status', 'active')->get();

        foreach ($companies as $company) {
            $this->processCompany($company);
        }

        $this->info('Cheque reminders queued successfully.');
    }

    private function processCompany($company)
    {
        // Switch tenant DB
        config(['database.connections.tenant.database' => $company->database_name]);
        DB::purge('tenant');
        DB::reconnect('tenant');

        // Fetch recipient
        $user = User::where('company_id', $company->id)->where('role', 'admin')->first();
        if (!$user) {
            $user = User::where('company_id', $company->id)->first();
        }
        
        if (!$user || empty($user->email)) {
            return;
        }

        $recipientEmail = $user->email;

        // Fetch Timezone
        $profile = CompanyProfile::first();
        $timezone = $profile->timezone ?? config('app.timezone', 'UTC');
        
        $today = Carbon::now($timezone)->startOfDay();
        
        // We look for cheques due in 5, 4, 3, 2, 1, or 0 days.
        $targetDates = [];
        for ($i = 0; $i <= 5; $i++) {
            $targetDates[$i] = $today->copy()->addDays($i)->format('Y-m-d');
        }

        $cheques = ChequeReminder::where('status', 'pending')
            ->whereIn('due_date', array_values($targetDates))
            ->get();

        if ($cheques->isEmpty()) {
            return;
        }

        $eligibleChequeIds = [];

        foreach ($cheques as $cheque) {
            $diffInDays = $today->diffInDays(Carbon::parse($cheque->due_date, $timezone)->startOfDay(), false);
            
            if ($diffInDays < 0 || $diffInDays > 5) continue;

            // Check if reminder already exists
            $existingSend = ChequeReminderSend::where('cheque_reminder_id', $cheque->id)
                ->where('reminder_day', $diffInDays)
                ->first();

            if ($existingSend) {
                // If it is queued but stuck for more than 2 hours, we can retry it by letting it pass
                if ($existingSend->status === 'queued' && $existingSend->created_at->diffInHours(now()) >= 2) {
                    $eligibleChequeIds[] = $cheque->id;
                }
                // If it is failed, we might want to retry, but Laravel queue handles standard retries.
                continue;
            } else {
                // Create queued record
                ChequeReminderSend::create([
                    'cheque_reminder_id' => $cheque->id,
                    'reminder_day' => $diffInDays,
                    'recipient' => $recipientEmail,
                    'status' => 'queued',
                ]);
                $eligibleChequeIds[] = $cheque->id;
            }
        }

        if (!empty($eligibleChequeIds)) {
            dispatch(new ProcessTenantChequeRemindersJob(
                $company->database_name, 
                $recipientEmail, 
                $eligibleChequeIds, 
                $today->format('d M Y')
            ));
        }
    }
}

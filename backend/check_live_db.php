<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Master\Company;
use App\Models\Master\User;
use App\Models\Tenant\CompanyProfile;
use App\Models\Tenant\ChequeReminder;
use Carbon\Carbon;

$companies = Company::where('status', 'active')->get();

foreach ($companies as $company) {
    echo "Processing Company: {$company->database_name}\n";
    config(['database.connections.tenant.database' => $company->database_name]);
    DB::purge('tenant');
    
    try {
        $user = User::where('company_id', $company->id)->where('role', 'admin')->first();
        if (!$user) {
            $user = User::where('company_id', $company->id)->first();
        }
        
        if (!$user || empty($user->email)) {
            echo " - Skipped: No user with email found.\n";
            continue;
        }

        $recipientEmail = $user->email;
        echo " - Admin Email: $recipientEmail\n";

        $profile = DB::connection('tenant')->table('company_profiles')->first();
        $timezone = $profile->timezone ?? 'UTC';
        echo " - Timezone: $timezone\n";
        
        $today = Carbon::now($timezone)->startOfDay();
        echo " - Today (Start of Day): " . $today->format('Y-m-d H:i:s') . "\n";
        
        $targetDates = [];
        for ($i = 0; $i <= 5; $i++) {
            $targetDates[$i] = $today->copy()->addDays($i)->format('Y-m-d');
        }
        echo " - Target Dates: " . implode(', ', $targetDates) . "\n";

        $cheques = DB::connection('tenant')->table('cheque_reminders')
            ->where('status', 'pending')
            ->whereIn('due_date', array_values($targetDates))
            ->get();

        if ($cheques->isEmpty()) {
            echo " - Skipped: No eligible pending cheques found matching target dates.\n";
            continue;
        }

        foreach ($cheques as $cheque) {
            echo " - Found Eligible Cheque: #{$cheque->cheque_number} (Due: {$cheque->due_date})\n";
            
            $diffInDays = $today->diffInDays(Carbon::parse($cheque->due_date, $timezone)->startOfDay(), false);
            echo "   -> Diff in days: $diffInDays\n";

            $existingSend = DB::connection('tenant')->table('cheque_reminder_sends')
                ->where('cheque_reminder_id', $cheque->id)
                ->where('reminder_day', $diffInDays)
                ->first();

            if ($existingSend) {
                echo "   -> Skipped: Reminder already exists for day $diffInDays (Status: {$existingSend->status})\n";
            } else {
                echo "   -> SUCCESS: Would queue this cheque!\n";
            }
        }
    } catch (\Exception $e) {
        echo " - Skipped: Exception (" . $e->getMessage() . ")\n";
    }
}

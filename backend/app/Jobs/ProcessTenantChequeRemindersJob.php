<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use App\Models\Tenant\ChequeReminder;
use App\Models\Tenant\ChequeReminderSend;
use App\Mail\ConsolidatedChequeRemindersMail;

class ProcessTenantChequeRemindersJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $databaseName;
    protected $recipientEmail;
    protected $chequeIds;
    protected $dateString;

    public function __construct($databaseName, $recipientEmail, $chequeIds, $dateString)
    {
        $this->databaseName = $databaseName;
        $this->recipientEmail = $recipientEmail;
        $this->chequeIds = $chequeIds;
        $this->dateString = $dateString;
    }

    public function handle(): void
    {
        config(['database.connections.tenant.database' => $this->databaseName]);
        DB::purge('tenant');
        DB::reconnect('tenant');

        DB::beginTransaction();

        try {
            $cheques = ChequeReminder::with('contact')
                ->whereIn('id', $this->chequeIds)
                ->get();
            
            if ($cheques->isEmpty()) {
                DB::rollBack();
                return;
            }

            $chequeData = $cheques->toArray();
            $sentRecords = ChequeReminderSend::whereIn('cheque_reminder_id', $this->chequeIds)
                ->where('status', 'queued')
                ->lockForUpdate()
                ->get();
            
            if ($sentRecords->isEmpty()) {
                // If there are no queued records, this might be a stale retry where it's already sent, halt.
                DB::rollBack();
                return;
            }

            foreach ($sentRecords as $record) {
                $record->status = 'sent';
                $record->sent_at = now();
                $record->save();
            }

            // Fire synchronously inside the job
            Mail::to($this->recipientEmail)->send(new ConsolidatedChequeRemindersMail($chequeData, $this->dateString));

            DB::commit();

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e; // Allow queue worker to handle standard retry
        }
    }
}

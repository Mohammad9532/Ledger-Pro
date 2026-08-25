<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Cheque Reminders</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #334155; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .cheque-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
        .cheque-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; color: #0f172a; }
        .cheque-detail { font-size: 14px; margin-bottom: 5px; }
        .amount { font-weight: bold; color: #0f172a; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8; }
        .badge-receivable { color: #16a34a; font-weight: bold; }
        .badge-payable { color: #dc2626; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Cheque Reminders</h2>
            <p>The following cheques require your attention.</p>
        </div>

        @foreach($cheques as $cheque)
            <div class="cheque-card">
                <div class="cheque-title">
                    Cheque #{{ $cheque['cheque_number'] }}
                    <span style="float: right" class="{{ $cheque['type'] === 'receivable' ? 'badge-receivable' : 'badge-payable' }}">
                        {{ ucfirst($cheque['type']) }}
                    </span>
                </div>
                <div class="cheque-detail"><strong>Bank:</strong> {{ $cheque['bank_name'] }}</div>
                <div class="cheque-detail"><strong>Contact:</strong> {{ $cheque['contact']['name'] ?? 'N/A' }}</div>
                <div class="cheque-detail"><strong>Amount:</strong> <span class="amount">{{ number_format($cheque['amount'], 2) }}</span></div>
                <div class="cheque-detail"><strong>Due Date:</strong> {{ \Carbon\Carbon::parse($cheque['due_date'])->format('M d, Y') }}</div>
                @if(!empty($cheque['notes']))
                    <div class="cheque-detail"><strong>Notes:</strong> {{ $cheque['notes'] }}</div>
                @endif
            </div>
        @endforeach

        <div class="footer">
            <p>You can manage these cheques in the Ledger Pro web dashboard.</p>
            <p>&copy; {{ date('Y') }} Ledger Pro. All rights reserved.</p>
        </div>
    </div>
</body>
</html>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Flight Itinerary / E-Ticket</title>
    <style>
        @page { margin: 32pt 34pt 50pt; }
        body { margin: 0; font-family: 'DejaVu Sans', sans-serif; font-size: 10px; line-height: 1.5; color: #26364a; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        td, th { vertical-align: top; overflow-wrap: break-word; word-wrap: break-word; }
        .brand { margin-bottom: 20px; }
        .brand-name { font-size: 18px; font-weight: bold; color: #142b45; line-height: 1.3; }
        .brand-logo { max-width: 150px; max-height: 48px; margin-bottom: 7px; }
        .contact { font-size: 9px; color: #64748b; margin-top: 5px; }
        .eyebrow { font-size: 8px; font-weight: bold; letter-spacing: 1.3px; text-transform: uppercase; color: #0f766e; }
        .document-title { font-size: 23px; font-weight: bold; line-height: 1.25; color: #142b45; margin-top: 5px; }
        .muted { color: #64748b; }
        .right { text-align: right; }
        .booking { background: #142b45; border-bottom: 4px solid #16a394; margin-bottom: 20px; }
        .booking td { padding: 14px 16px; color: #ffffff; }
        .booking-label { color: #c2d3e5; font-size: 8px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
        .reference { font-size: 21px; line-height: 1.3; font-weight: bold; letter-spacing: 1px; }
        .booking-value { font-size: 11px; font-weight: bold; }
        h2 { color: #142b45; font-size: 12px; margin: 0 0 9px; page-break-after: avoid; }
        .passengers { margin-bottom: 18px; }
        .passengers thead { display: table-header-group; }
        .passengers th { text-align: left; background: #f0f5f9; color: #54667a; text-transform: uppercase; letter-spacing: 0.6px; font-size: 8px; padding: 8px 12px; }
        .passengers td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; }
        .passengers tr { page-break-inside: avoid; }
        .passenger-name { font-weight: bold; color: #142b45; }
        .section-caption { font-size: 9px; color: #64748b; margin: -5px 0 10px; }
        .segment { border: 1px solid #d9e3ec; margin-bottom: 13px; page-break-inside: avoid; }
        .segment-head { background: #eff5f8; }
        .segment-head td { padding: 8px 12px; font-weight: bold; color: #142b45; }
        .segment-index { color: #0f766e; font-size: 9px; }
        .route td { padding: 10px 14px 8px; }
        .label { font-size: 8px; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px; }
        .airport-code { font-size: 27px; line-height: 1.2; font-weight: bold; color: #142b45; margin: 3px 0; }
        .airport-name { font-size: 9px; color: #54667a; }
        .time { font-size: 18px; font-weight: bold; line-height: 1.3; color: #142b45; margin-top: 8px; }
        .date { font-size: 9px; }
        .route-middle { text-align: center; vertical-align: middle; }
        .route-line { border-top: 1px solid #16a394; margin: 8px 0; }
        .flight-number { font-size: 11px; font-weight: bold; color: #0f766e; }
        .segment-meta { border-top: 1px solid #e2e8f0; }
        .segment-meta td { padding: 7px 12px; font-size: 9px; }
        .value { font-weight: bold; color: #26364a; margin-top: 2px; }
        .fare { margin: 17px 0; background: #f0f8f6; border-left: 3px solid #16a394; page-break-inside: avoid; }
        .fare td { padding: 10px 14px; vertical-align: middle; }
        .fare-amount { font-size: 16px; font-weight: bold; color: #142b45; }
        .notes { margin-top: 18px; padding-top: 12px; border-top: 1px solid #d9e3ec; page-break-inside: avoid; }
        .notes h2 { font-size: 10px; margin-bottom: 6px; }
        .notes ul { padding-left: 14px; margin: 0; color: #54667a; font-size: 9px; }
        .notes li { margin-bottom: 3px; }
        .footer { position: fixed; bottom: -28pt; left: 0; right: 0; border-top: 1px solid #d9e3ec; padding-top: 7px; font-size: 8px; color: #64748b; }
        @if(count($data['segments'] ?? []) > 1)
            body { line-height: 1.35; }
            .brand { margin-bottom: 12px; }
            .brand-logo { max-height: 36px; }
            .booking { margin-bottom: 14px; }
            .booking td { padding: 10px 14px; }
            .passengers { margin-bottom: 12px; }
            .passengers th, .passengers td { padding-top: 6px; padding-bottom: 6px; }
            .segment { margin-bottom: 10px; }
            .segment-head td { padding-top: 6px; padding-bottom: 6px; }
            .route td { padding-top: 6px; padding-bottom: 6px; }
            .airport-code { font-size: 24px; }
            .time { font-size: 16px; margin-top: 6px; }
            .segment-meta td { padding-top: 5px; padding-bottom: 5px; }
            .fare { margin: 12px 0; }
            .fare td { padding-top: 8px; padding-bottom: 8px; }
            .notes { margin-top: 12px; padding-top: 8px; }
        @endif
    </style>
</head>
<body>
    @php
        // Local closures allow more than one itinerary to render in the same process.
        $display = static fn ($value, $fallback = '-') => isset($value) && trim((string) $value) !== '' ? trim((string) $value) : $fallback;
        $airportCode = static function ($value) {
            $value = trim((string) $value);
            if (preg_match('/\(([a-z0-9]{3})\)\s*$/i', $value, $match)) {
                return strtoupper($match[1]);
            }
            return preg_match('/^[a-z]{3}$/i', $value) ? strtoupper($value) : '--';
        };
        $airportName = static fn ($value) => trim(preg_replace('/\s*\([a-z0-9]{3}\)\s*$/i', '', (string) $value));
        $dateValue = static function ($value, $format) {
            if (empty($value)) {
                return '-';
            }
            try {
                // Keep the entered local airport time; no server-timezone conversion.
                return \Carbon\Carbon::parse($value)->format($format);
            } catch (\Exception $exception) {
                return '-';
            }
        };
        $segments = $data['segments'] ?? [];
        $passengers = $data['passengers'] ?? (isset($data['passenger']) ? [$data['passenger']] : []);
        $bookingStatus = $display($data['status'] ?? $data['flight']['status'] ?? null, 'Not specified');
        $bookingDate = $data['booking_date'] ?? $data['journey']['booking_date'] ?? null;
        $fare = $data['fare'] ?? $data['flight']['fare'] ?? null;
        $hasFare = isset($fare) && trim((string) $fare) !== '';
        $hasPassport = count(array_filter($passengers, static fn ($passenger) => !empty($passenger['passport']))) > 0;
        $brandName = $profile->company_name ?? $company->company_name ?? 'Travel Services';
    @endphp

    <div class="footer">Flight itinerary / E-ticket &nbsp; | &nbsp; All flight times are local.</div>

    <table class="brand">
        <tr>
            <td style="width: 55%; padding-right: 20px;">
                @if(!empty($logoPath) && is_file($logoPath))
                    <img class="brand-logo" src="{{ $logoPath }}" alt="Company logo">
                @endif
                <div class="brand-name">{{ $brandName }}</div>
                @if(!empty($profile->address) || !empty($profile->phone) || !empty($profile->email))
                    <div class="contact">
                        @if(!empty($profile->address)) {!! nl2br(e($profile->address)) !!}<br> @endif
                        @if(!empty($profile->phone)) {{ $profile->phone }}<br> @endif
                        @if(!empty($profile->email)) {{ $profile->email }} @endif
                    </div>
                @endif
            </td>
            <td class="right" style="width: 45%;">
                <div class="eyebrow">Your travel document</div>
                <div class="document-title">Flight Itinerary</div>
                <div class="muted" style="margin-top: 4px;">E-ticket &amp; booking details</div>
            </td>
        </tr>
    </table>

    <table class="booking">
        <tr>
            <td style="width: 40%;">
                <div class="booking-label">Booking reference / PNR</div>
                <div class="reference">{{ strtoupper($display($segments[0]['pnr'] ?? null)) }}</div>
            </td>
            <td style="width: 30%;">
                <div class="booking-label">Booking date</div>
                <div class="booking-value">{{ $dateValue($bookingDate, 'd M Y') }}</div>
            </td>
            <td style="width: 30%;">
                <div class="booking-label">Booking status</div>
                <div class="booking-value">{{ $bookingStatus }}</div>
            </td>
        </tr>
    </table>

    <h2>Passenger details</h2>
    <table class="passengers">
        <thead>
            <tr>
                <th style="width: 8%;">No.</th>
                <th>Passenger name</th>
                @if($hasPassport)<th style="width: 28%;">Passport number</th>@endif
            </tr>
        </thead>
        <tbody>
            @forelse($passengers as $index => $passenger)
                <tr>
                    <td class="muted">{{ $index + 1 }}</td>
                    <td class="passenger-name">{{ $display(trim(($passenger['title'] ?? '') . ' ' . ($passenger['first_name'] ?? '') . ' ' . ($passenger['last_name'] ?? '')), 'Not provided') }}</td>
                    @if($hasPassport)<td>{{ $display($passenger['passport'] ?? null) }}</td>@endif
                </tr>
            @empty
                <tr><td colspan="{{ $hasPassport ? 3 : 2 }}" class="muted">Passenger details not provided.</td></tr>
            @endforelse
        </tbody>
    </table>

    <h2>Flight itinerary</h2>
    <div class="section-caption">Departure and arrival times are shown in each airport's local time.</div>
    @foreach($segments as $index => $segment)
        <div class="segment">
            <table class="segment-head">
                <tr>
                    <td style="width: 65%;"><span class="segment-index">FLIGHT {{ $index + 1 }}</span> &nbsp; {{ $display($segment['airline'] ?? null, 'Airline not specified') }}</td>
                    <td class="right" style="width: 35%;">{{ $display($segment['class'] ?? null) }}</td>
                </tr>
            </table>
            <table class="route">
                <tr>
                    <td style="width: 39%;">
                        <div class="label">Departure</div>
                        <div class="airport-code">{{ $airportCode($segment['from'] ?? '') }}</div>
                        <div class="airport-name">{{ $display($airportName($segment['from'] ?? ''), 'Airport not specified') }}</div>
                        <div class="time">{{ $dateValue($segment['departure'] ?? null, 'H:i') }}</div>
                        <div class="date">{{ $dateValue($segment['departure'] ?? null, 'D, d M Y') }}</div>
                    </td>
                    <td class="route-middle" style="width: 22%;">
                        <div class="flight-number">{{ $display($segment['flight_number'] ?? null) }}</div>
                        <div class="route-line"></div>
                        <div class="label">{{ $airportCode($segment['from'] ?? '') }} &gt; {{ $airportCode($segment['to'] ?? '') }}</div>
                    </td>
                    <td class="right" style="width: 39%;">
                        <div class="label">Arrival</div>
                        <div class="airport-code">{{ $airportCode($segment['to'] ?? '') }}</div>
                        <div class="airport-name">{{ $display($airportName($segment['to'] ?? ''), 'Airport not specified') }}</div>
                        <div class="time">{{ $dateValue($segment['arrival'] ?? null, 'H:i') }}</div>
                        <div class="date">{{ $dateValue($segment['arrival'] ?? null, 'D, d M Y') }}</div>
                    </td>
                </tr>
            </table>
            <table class="segment-meta">
                <tr>
                    <td style="width: 25%;"><div class="label">Airline PNR</div><div class="value">{{ strtoupper($display($segment['pnr'] ?? null)) }}</div></td>
                    <td style="width: 35%;"><div class="label">Ticket number</div><div class="value">{{ $display($segment['ticket_number'] ?? null, 'Not provided') }}</div></td>
                    <td style="width: 20%;"><div class="label">Checked baggage</div><div class="value">{{ $display($segment['baggage'] ?? null, 'Not specified') }}</div></td>
                    <td style="width: 20%;"><div class="label">Cabin baggage</div><div class="value">{{ $display($segment['cabin_baggage'] ?? null, 'Not specified') }}</div></td>
                </tr>
            </table>
            @if(!empty($segment['terminal']) || !empty($segment['gate']) || !empty($segment['seat']))
                <table class="segment-meta">
                    <tr>
                        <td><span class="muted">Departure terminal:</span> {{ $display($segment['terminal'] ?? null) }}</td>
                        <td><span class="muted">Departure gate:</span> {{ $display($segment['gate'] ?? null) }}</td>
                        <td><span class="muted">Seat:</span> {{ $display($segment['seat'] ?? null, 'Not assigned') }}</td>
                    </tr>
                </table>
            @endif
        </div>
    @endforeach

    @if($hasFare)
        <table class="fare">
            <tr>
                <td style="width: 55%;"><div class="label">Fare summary</div><div>Quoted fare for this itinerary</div></td>
                <td class="right fare-amount" style="width: 45%;">{{ $currency ?? 'INR' }} {{ is_numeric($fare) ? number_format((float) $fare, 2) : $fare }}</td>
            </tr>
        </table>
    @endif

    <div class="notes">
        <h2>Before you travel</h2>
        <ul>
            <li>Check your passenger details and carry the travel documents required for your journey.</li>
            <li>Confirm check-in times, terminal, gate and baggage allowance with your airline before departure.</li>
            <li>Changes, cancellations and refunds are subject to the airline's fare rules.</li>
            <li>This itinerary is not a boarding pass. Obtain your boarding pass during airline check-in.</li>
        </ul>
    </div>
</body>
</html>

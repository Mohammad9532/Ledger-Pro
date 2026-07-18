<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>E-Ticket / Flight Itinerary</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 11px;
            color: #333;
            line-height: 1.4;
            margin: 0;
            padding: 10px 20px;
        }
        
        table { width: 100%; border-collapse: collapse; }
        td { vertical-align: top; }
        
        .header-table { margin-bottom: 10px; }
        .company-name { font-size: 16px; font-weight: bold; color: #000; margin-bottom: 5px; }
        .company-address { font-size: 11px; color: #555; line-height: 1.3; }
        
        .pnr-text { font-size: 16px; font-weight: bold; color: #1e3a8a; /* dark blue */ text-align: right; margin-bottom: 25px; }
        .booking-details { text-align: right; font-size: 11px; color: #555; }
        
        .divider-thick { border-top: 4px solid #1e40af; margin: 15px 0; }
        .divider-thin { border-top: 2px solid #1e40af; margin: 10px 0; }
        .divider-dashed { border-top: 1px dashed #999; margin: 15px 0; }
        
        .section-title { font-size: 14px; font-weight: bold; color: #000; margin-bottom: 10px; }
        
        .data-table th { background-color: #f3f4f6; padding: 6px 10px; text-align: left; font-weight: bold; font-size: 11px; border: 1px solid #ccc; }
        .data-table td { padding: 6px 10px; font-size: 11px; border: 1px solid #ccc; }
        
        .flight-route { font-size: 14px; font-weight: bold; color: #000; margin: 5px 0; }
        
        .flight-details-table { margin-top: 10px; }
        .flight-details-table td { padding: 5px 10px 5px 0; }
        .flight-details-header { font-weight: bold; font-size: 12px; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
        
        .text-blue { color: #1e40af; }
        .font-bold { font-weight: bold; }
        .status-confirmed { color: #111; font-weight: bold; }
        
        .terms-list { padding-left: 20px; font-size: 10px; color: #444; }
        .terms-list li { margin-bottom: 6px; }
        
        .barcode-container { text-align: center; padding: 10px; }
        .barcode-bars { 
            display: inline-block;
            height: 30px;
            background: repeating-linear-gradient(
                90deg,
                #000,
                #000 2px,
                #fff 2px,
                #fff 4px,
                #000 4px,
                #000 5px,
                #fff 5px,
                #fff 8px
            );
            width: 150px;
        }
    </style>
</head>
<body>

    @php
        // Helper to extract airport code (text inside parentheses, e.g. "Varanasi (VNS)" -> "VNS")
        function getAirportCode($str) {
            if (preg_match('/\((.*?)\)/', $str, $matches)) {
                return $matches[1];
            }
            return strtoupper(substr($str, 0, 3));
        }
        
        $fromCode = getAirportCode($data['journey']['from'] ?? 'ORG');
        $toCode = getAirportCode($data['journey']['to'] ?? 'DST');
        
        $passengerName = trim(($data['passenger']['title'] ?? '') . ' ' . ($data['passenger']['first_name'] ?? '') . ' ' . ($data['passenger']['last_name'] ?? ''));
        $pnr = $data['flight']['pnr'] ?? 'N/A';
        
        $depDateStr = isset($data['journey']['departure']) && $data['journey']['departure'] ? strtotime($data['journey']['departure']) : null;
        $arrDateStr = isset($data['journey']['arrival']) && $data['journey']['arrival'] ? strtotime($data['journey']['arrival']) : null;
        
        $depDate = $depDateStr ? date('l', $depDateStr) . '<br><b>' . date('d M Y', $depDateStr) . '</b><br><b>' . date('h:i A', $depDateStr) . '</b>' : '<b>-</b>';
        $arrDate = $arrDateStr ? date('l', $arrDateStr) . '<br><b>' . date('d M Y', $arrDateStr) . '</b><br><b>' . date('h:i A', $arrDateStr) . '</b>' : '<b>-</b>';
    @endphp

    <table class="header-table">
        <tr>
            <td width="60%">
                <div class="company-name">{{ $profile->company_name ?? $company->company_name ?? 'Company Name' }}</div>
                <div class="company-address">
                    {!! nl2br(e($profile->address ?? '')) !!}<br>
                    @if(isset($profile->phone)) Phone No : {{ $profile->phone }} @endif
                </div>
            </td>
            <td width="40%">
                <div class="pnr-text">PNR: {{ strtoupper($pnr) }}</div>
                <div class="booking-details">
                    Booking Id : {{ strtoupper(substr(md5($pnr), 0, 6)) }}<br>
                    Issued Date : {{ date('D d M Y') }}
                </div>
            </td>
        </tr>
    </table>

    <div class="divider-thick"></div>

    <div class="section-title">Traveller Details</div>
    <table class="data-table">
        <tr>
            <th width="40%">Passenger Name</th>
            <th width="30%">Ticket Number</th>
            <th width="30%">Frequent Flyer No.</th>
        </tr>
        <tr>
            <td>1. {{ $passengerName }}</td>
            <td>{{ $data['flight']['ticket_number'] ?? $pnr }}</td>
            <td>-</td>
        </tr>
    </table>

    <div class="divider-dashed"></div>

    <div class="flight-route">
        &#9992; &nbsp;&nbsp; {{ $fromCode }} - {{ $toCode }}
    </div>

    <div class="divider-thin"></div>

    <table class="flight-details-table">
        <tr>
            <td width="25%">
                <div class="flight-details-header">Flight</div>
                <div style="color: #e11d48; font-weight: bold; font-style: italic; font-size: 14px; margin-bottom: 5px;">{{ $data['flight']['airline'] ?? 'Airline' }}</div>
                <div class="font-bold">{{ $data['flight']['airline'] ?? '' }} {{ $data['flight']['flight_number'] ?? '' }}</div>
                <div style="color: #666; margin-top: 2px;">{{ $data['flight']['class'] ?? 'Economy Class' }}</div>
            </td>
            <td width="25%">
                <div class="flight-details-header">Departure</div>
                <div>{{ $data['journey']['from'] ?? '-' }}</div>
                <div class="font-bold" style="margin-top: 2px; margin-bottom: 10px;">{{ $data['journey']['from'] ?? '-' }}</div>
                <div>{!! $depDate !!}</div>
            </td>
            <td width="25%">
                <div class="flight-details-header">Arrival</div>
                <div>{{ $data['journey']['to'] ?? '-' }}</div>
                <div class="font-bold" style="margin-top: 2px; margin-bottom: 10px;">{{ $data['journey']['to'] ?? '-' }}</div>
                <div>{!! $arrDate !!}</div>
            </td>
            <td width="25%">
                <div class="flight-details-header">Status</div>
                <div class="status-confirmed">{{ strtoupper($data['flight']['status'] ?? 'CONFIRMED') }}</div>
                <div style="color: #666; margin-top: 3px;">Airline PNR: {{ strtoupper($pnr) }}</div>
                <div style="color: #666; margin-top: 3px;">Baggage: {{ $data['flight']['baggage'] ?? 'Check-in' }}</div>
                <div style="color: #666; margin-top: 3px;">Cabin: {{ $data['flight']['cabin_baggage'] ?? '7 Kg' }}</div>
                <div style="color: #666; margin-top: 3px;">Non Refundable</div>
            </td>
        </tr>
    </table>

    <div class="divider-dashed"></div>

    <table class="data-table">
        <tr>
            <th width="40%">Pax Name</th>
            <th width="20%">Segments</th>
            <th width="40%">Barcode</th>
        </tr>
        <tr>
            <td style="vertical-align: middle;">{{ $passengerName }}</td>
            <td style="vertical-align: middle; text-align: center;">{{ $fromCode }}-{{ $toCode }}</td>
            <td class="barcode-container">
                <!-- CSS Based Barcode representation -->
                <div class="barcode-bars"></div>
            </td>
        </tr>
    </table>

    <div class="section-title" style="margin-top: 20px;">Terms & Conditions</div>
    <ul class="terms-list">
        <li>All Passengers must carry a Valid Photo Identity Proof at the time of Check-in.</li>
        <li>This can include: Driving License, Passport, PAN Card, Voter ID Card or any other ID issued by the Government. For infant passengers, it is mandatory to carry the Date of Birth certificate.</li>
        <li>Reach the terminal at least 2 hours prior to the departure for domestic flight and 4 hours prior to the departure of international flight.</li>
        <li>Flight timings are subject to change without prior notice. Please recheck with the carrier prior to departure.</li>
        <li>Important Notes for Offer Fare: Booking Confirmation: May take up to 60 minutes. Web Check-In: Available on the airline's website, starting one day before departure after 6 PM. Seat Availability: Seats are subject to availability. If unavailable, a refund will be issued.</li>
    </ul>

    <div class="divider-dashed"></div>

    <div class="section-title">Baggage Information</div>
    <ul class="terms-list">
        <li><b>Free Cabin Baggage Allowance:</b> As per Bureau of Civil Aviation Security (BCAS) guidelines traveling passenger may carry maximum {{ $data['flight']['cabin_baggage'] ?? '7 Kgs' }} per person per flight (only one piece measuring not more than 55 cm x 35 cm x 25 cm, including laptops or duty free shopping bags). The dimensions of the checked Baggage should not exceed 158 cm (62 inches) in overall dimensions (L + W + H).</li>
        <li><b>Check-in Baggage:</b> {{ $data['flight']['baggage'] ?? 'Subject to airline policy' }}.</li>
    </ul>

</body>
</html>

@extends('reports.layout')

@section('content')
<style>
    .ticket-section { margin-bottom: 25px; }
    .ticket-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; border: 1px solid #ddd; }
    .ticket-table th { background-color: #f5f5f5; border-bottom: 1px solid #ddd; padding: 8px; font-size: 10px; font-weight: bold; text-align: left; }
    .ticket-table td { padding: 8px; font-size: 10px; border-bottom: 1px solid #eee; }
    .ticket-table td.label { font-weight: bold; color: #555; width: 25%; background-color: #fafafa; border-right: 1px solid #eee; }
    
    .passenger-name { font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #111; }
    
    .flight-box { border: 2px solid #333; padding: 15px; background-color: #fff; margin-bottom: 20px; border-radius: 4px; }
    .flight-route { font-size: 16px; font-weight: bold; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
    .airport-code { font-size: 20px; color: #333; }
    
    .grid-2 { width: 100%; margin-bottom: 15px; }
    .grid-2 td { vertical-align: top; width: 50%; }
</style>

<div class="ticket-section">
    <div class="passenger-name">
        Passenger: {{ $data['passenger']['title'] ?? '' }} {{ $data['passenger']['first_name'] ?? '' }} {{ $data['passenger']['last_name'] ?? '' }}
    </div>
    
    <table class="grid-2">
        <tr>
            <td style="padding-right: 10px;">
                <div class="flight-box">
                    <table width="100%">
                        <tr>
                            <td width="45%" class="text-center">
                                <div class="airport-code">{{ substr($data['journey']['from'] ?? 'ORG', 0, 3) }}</div>
                                <div>{{ $data['journey']['from'] ?? '-' }}</div>
                            </td>
                            <td width="10%" class="text-center" style="font-size: 20px;">✈</td>
                            <td width="45%" class="text-center">
                                <div class="airport-code">{{ substr($data['journey']['to'] ?? 'DST', 0, 3) }}</div>
                                <div>{{ $data['journey']['to'] ?? '-' }}</div>
                            </td>
                        </tr>
                    </table>
                </div>
            </td>
            <td style="padding-left: 10px;">
                <table class="ticket-table">
                    <tr><td class="label">Airline</td><td>{{ $data['flight']['airline'] ?? '-' }}</td></tr>
                    <tr><td class="label">Flight No.</td><td><b>{{ $data['flight']['flight_number'] ?? '-' }}</b></td></tr>
                    <tr><td class="label">PNR / Booking Ref</td><td><b>{{ $data['flight']['pnr'] ?? '-' }}</b></td></tr>
                    <tr><td class="label">Status</td><td><span style="color: #10b981; font-weight: bold;">{{ $data['flight']['status'] ?? 'Confirmed' }}</span></td></tr>
                </table>
            </td>
        </tr>
    </table>
</div>

<div class="ticket-section">
    <div class="section-title">FLIGHT & JOURNEY DETAILS</div>
    <table class="ticket-table">
        <tr>
            <td class="label">Departure Date & Time</td>
            <td><b>{{ $data['journey']['departure'] ?? '-' }}</b></td>
            <td class="label">Arrival Date & Time</td>
            <td><b>{{ $data['journey']['arrival'] ?? '-' }}</b></td>
        </tr>
        <tr>
            <td class="label">Terminal</td>
            <td>{{ $data['journey']['terminal'] ?? '-' }}</td>
            <td class="label">Gate</td>
            <td>{{ $data['journey']['gate'] ?? 'TBA' }}</td>
        </tr>
        <tr>
            <td class="label">Class</td>
            <td>{{ $data['flight']['class'] ?? 'Economy' }}</td>
            <td class="label">Seat Number</td>
            <td><b>{{ $data['flight']['seat'] ?? 'Check-in' }}</b></td>
        </tr>
    </table>
</div>

<div class="ticket-section">
    <div class="section-title">PASSENGER INFORMATION</div>
    <table class="ticket-table">
        <tr>
            <td class="label">Passport Number</td>
            <td>{{ $data['passenger']['passport'] ?? '-' }}</td>
            <td class="label">Ticket Number</td>
            <td>{{ $data['flight']['ticket_number'] ?? '-' }}</td>
        </tr>
        <tr>
            <td class="label">Check-in Baggage</td>
            <td>{{ $data['flight']['baggage'] ?? '-' }}</td>
            <td class="label">Cabin Baggage</td>
            <td>{{ $data['flight']['cabin_baggage'] ?? '-' }}</td>
        </tr>
    </table>
</div>

<div style="margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-left: 3px solid #333; font-size: 9px; color: #555;">
    <b>Important Information:</b><br>
    - Please arrive at the airport at least 2 hours before the scheduled departure time.<br>
    - Ensure you carry a valid photo ID and passport (if traveling internationally).<br>
    - Baggage allowance is subject to airline rules. Oversized/extra baggage may incur additional charges at the airport.
</div>
@endsection

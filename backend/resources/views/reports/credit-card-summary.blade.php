@extends('reports.layout')

@section('content')
    <div class="section-title">CREDIT CARD ACCOUNTS SUMMARY</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>Card Account Name</th>
                <th class="text-right">Balance</th>
                <th class="text-right">Outstanding Amount</th>
            </tr>
        </thead>
        <tbody>
            @php 
                $totalBalance = 0; 
                $totalOutstanding = 0; 
            @endphp
            
            @forelse($data as $item)
                @php 
                    $totalBalance += (float)$item['balance'];
                    $totalOutstanding += (float)$item['outstanding'];
                @endphp
                <tr>
                    <td>{{ $item['name'] }}</td>
                    <td class="text-right">{{ number_format($item['balance'], 2) }}</td>
                    <td class="text-right">{{ number_format($item['outstanding'], 2) }}</td>
                </tr>
            @empty
                <tr><td colspan="3" class="text-center" style="color:#999">No credit card accounts to display</td></tr>
            @endforelse
            <tr class="total-row">
                <td>TOTAL</td>
                <td class="text-right">{{ $currency ?? '' }} {{ number_format($totalBalance, 2) }}</td>
                <td class="text-right">{{ $currency ?? '' }} {{ number_format($totalOutstanding, 2) }}</td>
            </tr>
        </tbody>
    </table>
@endsection

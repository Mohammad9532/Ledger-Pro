@extends('reports.layout')

@section('content')
    <!-- Executive Summary Cards -->
    <table class="summary-wrapper" cellpadding="0" cellspacing="0">
        <tr>
            <td width="31%" class="summary-card">
                <div class="summary-card-title">Assets</div>
                <div class="summary-card-value text-asset">{{ number_format($data['total_assets'], 2) }}</div>
            </td>
            <td width="3.5%"></td>
            <td width="31%" class="summary-card">
                <div class="summary-card-title">Liabilities</div>
                <div class="summary-card-value text-liability">{{ number_format(abs($data['total_liabilities']), 2) }}</div>
            </td>
            <td width="3.5%"></td>
            <td width="31%" class="summary-card">
                <div class="summary-card-title">Equity</div>
                <div class="summary-card-value text-equity">{{ number_format(abs($data['total_equity']), 2) }}</div>
            </td>
        </tr>
    </table>

    <table class="w-100" cellpadding="0" cellspacing="0">
        <tr>
            <!-- Left Column: Assets -->
            <td class="w-50 align-top" style="padding-right: 15px;">
                <div class="section-title">ASSETS</div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Account Name</th>
                            <th class="text-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        @if(count($data['current_assets']) > 0)
                            <tr><td colspan="2" style="font-weight: bold; background-color: #f5f5f5;">Current Assets</td></tr>
                            @foreach($data['current_assets'] as $item)
                                <tr>
                                    <td style="padding-left: 15px;">{{ $item['name'] }}</td>
                                    <td class="text-right">{{ number_format(abs($item['balance']), 2) }}</td>
                                </tr>
                            @endforeach
                            <tr class="subtotal-row">
                                <td style="padding-left: 15px;">Total Current Assets</td>
                                <td class="text-right">{{ number_format(abs($data['total_current_assets']), 2) }}</td>
                            </tr>
                        @endif

                        @if(count($data['non_current_assets']) > 0)
                            <tr><td colspan="2" style="font-weight: bold; background-color: #f5f5f5; border-top: 1px solid #eee;">Non-Current Assets</td></tr>
                            @foreach($data['non_current_assets'] as $item)
                                <tr>
                                    <td style="padding-left: 15px;">{{ $item['name'] }}</td>
                                    <td class="text-right">{{ number_format(abs($item['balance']), 2) }}</td>
                                </tr>
                            @endforeach
                            <tr class="subtotal-row">
                                <td style="padding-left: 15px;">Total Non-Current Assets</td>
                                <td class="text-right">{{ number_format(abs($data['total_non_current_assets']), 2) }}</td>
                            </tr>
                        @endif
                        
                        <tr class="total-row">
                            <td>TOTAL ASSETS</td>
                            <td class="text-right">{{ $currency ?? '' }} {{ number_format(abs($data['total_assets']), 2) }}</td>
                        </tr>
                    </tbody>
                </table>
            </td>

            <!-- Right Column: Liabilities & Equity -->
            <td class="w-50 align-top" style="padding-left: 15px;">
                <div class="section-title">LIABILITIES</div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Account Name</th>
                            <th class="text-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        @if(count($data['current_liabilities']) > 0)
                            <tr><td colspan="2" style="font-weight: bold; background-color: #f5f5f5;">Current Liabilities</td></tr>
                            @foreach($data['current_liabilities'] as $item)
                                <tr>
                                    <td style="padding-left: 15px;">{{ $item['name'] }}</td>
                                    <td class="text-right">{{ number_format(abs($item['balance']), 2) }}</td>
                                </tr>
                            @endforeach
                            <tr class="subtotal-row">
                                <td style="padding-left: 15px;">Total Current Liabilities</td>
                                <td class="text-right">{{ number_format(abs($data['total_current_liabilities']), 2) }}</td>
                            </tr>
                        @endif

                        @if(count($data['non_current_liabilities']) > 0)
                            <tr><td colspan="2" style="font-weight: bold; background-color: #f5f5f5; border-top: 1px solid #eee;">Non-Current Liabilities</td></tr>
                            @foreach($data['non_current_liabilities'] as $item)
                                <tr>
                                    <td style="padding-left: 15px;">{{ $item['name'] }}</td>
                                    <td class="text-right">{{ number_format(abs($item['balance']), 2) }}</td>
                                </tr>
                            @endforeach
                            <tr class="subtotal-row">
                                <td style="padding-left: 15px;">Total Non-Current Liabilities</td>
                                <td class="text-right">{{ number_format(abs($data['total_non_current_liabilities']), 2) }}</td>
                            </tr>
                        @endif
                        
                        <tr class="total-row">
                            <td>TOTAL LIABILITIES</td>
                            <td class="text-right">{{ $currency ?? '' }} {{ number_format(abs($data['total_liabilities']), 2) }}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="section-title" style="margin-top: 20px;">EQUITY</div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Account Name</th>
                            <th class="text-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($data['equity'] as $item)
                            <tr>
                                <td>{{ $item['name'] }}</td>
                                <td class="text-right">{{ number_format(abs($item['balance']), 2) }}</td>
                            </tr>
                        @endforeach
                        <tr class="total-row">
                            <td>TOTAL EQUITY</td>
                            <td class="text-right">{{ $currency ?? '' }} {{ number_format(abs($data['total_equity']), 2) }}</td>
                        </tr>
                    </tbody>
                </table>

                <!-- Final check row -->
                @php 
                    $totalLE = bcadd($data['total_liabilities'], $data['total_equity'], 4);
                @endphp
                <table class="data-table">
                    <tbody>
                        <tr class="total-row">
                            <td style="font-size: 11px;">TOTAL LIABILITIES & EQUITY</td>
                            <td class="text-right" style="font-size: 11px;">{{ $currency ?? '' }} {{ number_format(abs($totalLE), 2) }}</td>
                        </tr>
                    </tbody>
                </table>
            </td>
        </tr>
    </table>
@endsection

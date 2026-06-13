<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Contact;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function search(Request $request): JsonResponse
    {
        $q = $request->get('q', '');
        if (strlen($q) < 1) {
            return response()->json(['results' => []]);
        }

        $results = [];

        // Search contacts
        $contacts = Contact::where('name', 'like', "%{$q}%")
            ->whereNull('deleted_at')
            ->limit(5)
            ->get(['id', 'name', 'phone']);

        foreach ($contacts as $contact) {
            $results[] = ['type' => 'contact', 'id' => $contact->id, 'label' => $contact->name, 'sub' => $contact->phone];
        }

        // Search transactions (including by txn_number)
        $txns = Transaction::where(function ($query) use ($q) {
                $query->where('description', 'like', "%{$q}%")
                      ->orWhere('reference_number', 'like', "%{$q}%")
                      ->orWhere('txn_number', 'like', "%{$q}%")
                      ->orWhere('id', $q);
                if (is_numeric($q)) {
                    $query->orWhere('amount', $q);
                }
            })
            ->whereNull('deleted_at')
            ->limit(5)
            ->get(['id', 'txn_number', 'type', 'date', 'amount', 'description']);

        foreach ($txns as $txn) {
            $results[] = [
                'type' => 'transaction',
                'id' => $txn->id,
                'label' => "{$txn->txn_number} — {$txn->description}",
                'sub' => "{$txn->type} | ₹{$txn->amount} | {$txn->date}",
            ];
        }

        // Search accounts
        $accounts = Account::where('name', 'like', "%{$q}%")
            ->whereNull('deleted_at')
            ->limit(5)
            ->get(['id', 'name', 'type']);

        foreach ($accounts as $account) {
            $results[] = ['type' => 'account', 'id' => $account->id, 'label' => $account->name, 'sub' => $account->type];
        }

        return response()->json(['results' => $results]);
    }
}

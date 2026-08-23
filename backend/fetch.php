<?php
$ch = curl_init('http://127.0.0.1:8000/api/contacts?status=active');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "Status: $httpcode\n";
echo "Response: $response\n";

<?php

// This is the local file to echo, wrapped as JSONP. It's being generated on the
// server daily, through the fetch_interpreti_concerts.py script.
define('CONCERTS_JSON', 'concerts.json');

$data = '[]';

if (file_exists(CONCERTS_JSON)) {
	$data = file_get_contents(CONCERTS_JSON);
}

// Check if a callback name was supplied, if so this is JSONP.
$callback = filter_input(INPUT_GET, 'callback', FILTER_SANITIZE_STRING);

// Set content type for JSONP or JSON, depending on if there was a callback name.
header('Content-Type: ' . (!empty($callback) ? 'application/javascript' : 'application/json') . ';charset=UTF-8');

// Finally, output the data.
if ($callback) {
	$data = sprintf('%s(%s)', $callback, $data);
}

echo $data;
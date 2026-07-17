<?php
var_dump(DB::connection('master')->getPdo()->getAttribute(PDO::ATTR_CONNECTION_STATUS));

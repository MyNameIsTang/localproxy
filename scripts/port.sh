lsof -i :$1 | grep LISTEN | awk '{print $2}'

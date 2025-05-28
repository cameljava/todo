# ToDo Backend

The powerful engine behind our new fangled app that is going to send us to the moon 🚀.

It consists of a backend application, and a server which provides an HTTP API.

## Scripts

```
# Install Dependencies
npm install

# Start Dev Server
npm run dev

# Build
npm run build

# Run Tests (from built files)
npm run test

# Start Server
npm run start
```

## HTTP API Features

### List Todos

```
curl --request GET \
  --url http://localhost:3000/ \
  --header 'content-type: application/json'
```

### Add Todo

```
curl --request POST \
  --url http://localhost:3000/ \
  --header 'content-type: application/json' \
  --data '{ "summary": "Got to do this!", "done": false }'
```

### Update Todo

```
curl --request POST \
  --url http://localhost:3000/{id} \
  --header 'content-type: application/json' \
  --data '{ "done": true }'
```

### Remove Todo

```
curl --request DELETE \
  --url http://localhost:3000/{id}
```

## Error Handling

If an unexpected error occurs, it will be logged to the console.
During normal operations, no errors will be logged.

To test this, as special HTML header has been added to trigger an exception.

```
curl --request GET \
  --url http://localhost:3000/ \
  --header 'content-type: application/json' \
  --header 'x-detonator: armed'
```

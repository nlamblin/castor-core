# CastorJS the Document Management System

Coming soon...

## Contributing

### Writing themes

#### Theme-specific routes

Theme-specific route example:

1. modify `index.js` in the theme:
```javascript
module.exports = { 
  "routes": {
    "/fake" : "fake.js"
  }
};
```
2. create a file `./routes/fake.js` in the theme:
```javascript
module.exports = function(config) {
  return function (req, res, next) {
    res.status(200).send('Fake').end();
  };
};
```

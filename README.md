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

#### Add & use Nunjucks filters

Add a new filter to your theme :

1. Create a 'filters' folder in your theme directory

2. Add your_filter_name.js to your theme's filters folder

3. Call the filter in your instance.json config file:
```json
"filters" : {
    "your_filter_file_name" : "your_filter_name",
    "another_filter_file_name" : "another_filter_name"
  }
```
List & how to use castor's filters :

* split(*separator*)
	Return an array of X elements divided by separator

* add2Array(*itemToAdd* , position)
	Add an item to an array and return it,
	If no position , push will be the method used



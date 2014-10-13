# CastorJS the Document Management System

Coming soon...

## Configuration

Each castor instance has a configuration (either in a file, either
in parameters, like when using `castor-cli`).

See [castor-cli](https://github.com/castorjs/castor-cli).

The configuration object has first level keys, but also further level
ones.
General configuration has first-level keys.

### General
#### title
The title key is present in the title of each page (although depending
on themes too).
**Optional**

Ex:

```json
{
  "title": "First study"
}
```


### collectionName
The of the MongoDb collection.
Default value: a hash of the data path.
**Optional**

Useful to quickly find the right collection in mongo.

Ex:

```json
{
  "collectionName": "first_study"
}
```

#### connexionURI
The connection string to mongo.

Default value: `mongodb://localhost:27017/castor/`

Ex:

```json
{
  "collexionURI": "mongodb://localhost:27017/test/"
}
```

#### port
The port of web server.

Default value: first free port beginning with 3000.

Ex:

```json
{
  "port": 8080
}
```

#### itemsPerPage
The number of items returned in a query.

Default value: 30.

Ex:

```json
{
  "itemsPerPage": 5
}
```


### Pages
Each HTML page of a [theme](themes/default),can have a `title` and
a  `description` (see
[default `layout.html`](themes/default/layout.html)).

A theme is free to use them as it wants.

To modify the `title` or the `description` of a page, you have to know
the identifier of the page.

Typically, a page identifier is the first part of a `.html` file in a
theme (e.g.: `index`, `browse`, `display`, ...).

Default values are empty ones.

Example for [castor-theme-sbadmin](https://github.com/castorjs/castor-theme-sbadmin):

```json
{
  "pages": {
    "index" : {
      "title"       : "Dashboard",
      "description" : "Dashboard of the first study"
    },
    "chart" : {
      "title"       : "Graph",
      "description" : "First study's details"
    },
    "documents" : {
      "title"       : "Documents",
      "description" : "First study's documents"
    }
  }
}
```

### customFields
See [castor-load-custom](https://github.com/castorjs/castor-load-custom).

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



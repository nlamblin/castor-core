# CastorJS the Document Management System

High configurable web server for documents files

## Configuration

Each castor instance has a configuration (either in a file, either
in parameters, like when using `castor-cli`).

See [castor-cli](https://github.com/castorjs/castor-cli).

The configuration object has first level keys, but also further level
ones.
General configuration has first-level keys.

### General
#### title
Site title. The title key is present for each page (although depending on themes too).
**Optional**

Ex:

```json
{
  "title": "First study"
}
```

#### description
Site description. The description key is present for of each page (although depending on themes too).
**Optional**

Ex:

```json
{
  "description": "My First study is cool"
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
  "connexionURI": "mongodb://localhost:27017/test/"
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

### documentFields
See [castor-load-custom](https://github.com/castorjs/castor-load-custom).


### routes

Add specific route.

Ex : 

1. modify `index.js` in the theme:

  ```json
{
	"routes": {
		"/fake" : "fake.js"
	}
}
  ```
2. create a file `./routes/fake.js` in the theme:

  ```javascript
  module.exports = function(config) {
    return function (req, res, next) {
      res.status(200).send('Fake').end();
    };
  };
  ```

#### debug
To swith to debug mode

Default value: `false`

Ex:

```json
{
  "debug": true
}
```

#### logFormat
Choose the log format for STDIN. see [Morgan Predefined formats](https://github.com/expressjs/morgan#predefined-formats)

Default value: `combined`

Ex:

```json
{
  "logFormat": "dev"
}
```

#### markdown
Markdown options. see [Marked Options](https://github.com/chjj/marked#options-1)

Default value: `undefined`

Ex:

```json
{
  "markdown": {
		 gfm: true,
		 tables: true,
		 breaks: false,
		 pendantic: false,
		 sanitize: true,
		 smartLists: true,
		 smartypants: false
  }
}
```


#### theme
FIXME

Default value: `default`

Ex:

```json
{
  "theme": "my-theme"
}
```

#### middlewares
FIXME


Ex:

```json
{
  "middlewares": {}
}
```

#### asynchronousFilters
FIXME

Ex:

```json
{
  "asynchronousFilters": {}
}
```

#### operators
FIXME

Ex:

```json
{
  "operators": {}
}
```

#### loaders
FIXME

Ex:

```json
{
  "loaders": {}
}
```

#### browserifyModules
FIXME

Ex:

```json
{
  "browserifyModules": {}
}
```

#### concurrency
FIXME
Default value: `CPUs number`

Ex:

```json
{
  "concurrency": 8
}
```

#### delay
FIXME

Default value: 250

Ex:

```json
{
  "delay": 1000
}
```

#### maxFileSize
FIXME

Default value: `128mb`

Ex:

```json
{
  "maxFileSize": "1gb"
}
```

#### heartrate
FIXME

Default value: 5000

Ex:

```json
{
  "heartrate": 1800000
}
```

#### turnoffAll
FIXME

Default value: `false`

Ex:

```json
{
  "turnoffAll": true
}
```

#### turnoffSync
FIXME

Default value: `false`

Ex:

```json
{
  "turnoffSync": true
}
```

#### turnoffPrimus
FIXME

Default value: `false`

Ex:

```json
{
  "turnoffPrimus": true
}
```

#### turnoffRoutes
FIXME

Default value: `false`

Ex:

```json
{
  "turnoffRoutes": "false"
}
```

#### turnoffIndexes
FIXME

Default value: `false`

Ex:

```json
{
  "turnoffIndexes": "false"
}
```

#### turnoffWebdav
FIXME

Default value: `false`

Ex:

```json
{
  "turnoffWebdav": true
}
```

#### turnoffComputer
FIXME

Default value: `false`

Ex:

```json
{
  "turnoffComputer": true
}
```

#### turnoffUpload
FIXME

Default value: `false`

Ex:

```json
{
  "turnoffUpload": true
}
```

#### filesToIgnore
FIXME

Default value: `[ "**/.*", "~*", "*~", "*.sw?", "*.old", "*.bak", "**/node_modules", "Thumbs.db" ]`

Ex:

```json
{
  "filesToIgnore": [ "**/*.txt"]
}
```

#### tempPath
FIXME

Default value: `OS default temp directory`

Ex:

```json
{
  "tempPath": "/tmp"
}
```

#### documentFields

``documentFields` are fields of documents, that are not parts of the input document, but computed when loading.

They use [JBJ](http://castorjs.github.io/node-jbj/) syntax to add fields to the document, computed from the current document.

#### corpusFields

``corpusFields` are fields computed from the whole corpus, like the number of records, the period it covers (from `year` document field, for example), etc.

They are computed when the corpus is finished loading. Like `documentFields`, they use 
[JBJ](http://castorjs.github.io/node-jbj/) syntax.

Ex:

```json
{
  "corpusFields": {
    "$recordNb": {
      "$?": "local:///compute.json?operator=count&field=wid",
      "parseJSON": true,
      "get": "data.0.value",
      "cast": "number"
    }
  }
}
```

### filters 

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

* objectPath(*path*)
  get a deep property of the object, using dot notation.
  see [objectPath.get](https://github.com/mariocasciaro/object-path/blob/master/README.md#usage) in [object-path](https://www.npmjs.org/package/object-path).

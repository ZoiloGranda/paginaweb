//  se requieren las dependencias
var express = require('express');
// mongoose es la libreria de node para conectarse con mongodb
var mongoose = require('mongoose');
// el bodyparser es necesario para leer las respuestas del servidor de una forma sencilla
var bodyParser = require('body-parser');
// multer es un paquete para manejar archivos enviados con multipart/form-data, que se usa como enctype en el formulario de html
var multer = require('multer');
// cloudinary es la libreria de cloudinary para subir imagenes en la nube
var cloudinary = require('cloudinary');
// se le pasa el parametro dest que es el destino donde va a guardar la imagenes
// antes de subirlas a cloudinary, en este caso se van a guardar en la carpeta uploads
var upload = multer({dest: 'uploads/'});
//libreria para sobreescribir los metodos http no soportados por los navegadores
var methodOverride = require('method-override');
//middleware para cargar el favicon
var favicon = require('serve-favicon');

//este schema se crea asi para poder agregarle atributos virtuales
//losatributos virtuales son atributos que no se guardan como tal en la base de datos
var Schema = mongoose.Schema;
var appPassword=12345;
//el port se especifica asi, que quiere decir que el puerto lo coloque el servidor, y sino lo coloca, entonces usa el puerto 8080
//var port=process.env.PORT || 8080;

// para conectar mongoose a la base de datos
// configuracion inicial de cloudinary, estos valores se sacan del usuario que se crea en la pagina de cloudinary
cloudinary.config({
  cloud_name: 'zgranda',
  api_key: '162961879152527',
  api_secret: 'jIalMZvruz-ECfN-ig7-wntAnkg',
});
//  con esta funcion se crea la aplicacion, y se asigna a la variable app, para poder accederla
var app = express();

// Here we find an appropriate database to connect to, defaulting to
    // localhost if we don't find one.
    var uristring =
    process.env.MONGOLAB_URI ||
    process.env.MONGOHQ_URL ||
    'mongodb://localhost/primera';

        mongoose.connect(uristring, function(err, res) {
      if (err) {
      console.log ('ERROR connecting to: ' + uristring + '. ' + err);
      } else {
      console.log ('Succeeded connected to: ' + uristring);
      }
    });

//se configura method-override para que reciba los parametros _method desde las vistas
app.use(methodOverride('_method'));
app.use(favicon(__dirname + '/public/img/favicon.ico'));

var middlewareUpload = upload.single('image');
/** bodyParser.urlencoded(options)
 * Parses the text as URL encoded data (which is how browsers tend to send form data from regular forms set to POST)
 * and exposes the resulting object (containing the keys and values) on req.body
 */
 app.use(bodyParser.urlencoded({
  extended: true,
}));
/**bodyParser.json(options)
 * Parses the text as JSON and exposes the resulting object on req.body.
 */
 app.use(bodyParser.json());
// definir schema del producto
var productSchemaJSON = {
  title: String,
  description: String,
  imageUrl: String,
  pricing: Number,
};
//cuando se crea un objeto utilizando new schema, se le pueden asignar propiedades virtuales
var productSchema = new Schema(productSchemaJSON);
//crea un atributo virtual, llamado imageUrl
//va a ser del tipo get
productSchema.virtual('imageUrlVirtual').get(function() {
  //primero se valida si no se cargó  una imagen cuando se creó el producto
  //si no se cargó imagen, entonces se utiliza una imagen por defecto
if (this.imageUrl===''|| this.imageUrl==='imagen.png') {
  return 'default.jpg';
}
return this.imageUrl;
});
// inicia el modelo producto con el productschema
var Product = mongoose.model('Product', productSchema);
// se coloca a pug como administrador de vistas
// al hacerlo asi no hace falta requerirlo al inicio del documento con var pug=require('pug');
// por defecto se buscan las vistas en la carpeta views
app.set('view engine', 'pug');
// app.use llama a un middleware
// express.static es un middleware que que se encarga de cargar un directorio, y se le pasa la ruta del directorio
// como parametro ('public')
// al cargar la carpeta public, se puede acceder a su contenido de manera relativa
app.use(express.static('public'));
//  se acepta una peticion por el metodo http get en la ruta '/'
//  req es la solicitud del usuario, donde esta toda la informacion que envia el usuario
//  res es la respuesta del servidor a la solicitud
app.get('/', function(req, res) {
  //  res.render renderiza la vista que se le pasa como parametro, y la devuelve como respuesta
  res.render('index');
  //  send envia informacion al usuario, send termina la respuesta, no hace falta llamar a end despues
  //  res.send('hola');

  //  res.end termina la respuesta del servidor, si no se coloca, se queda cargando el navegador
  //  res.end('hola mundo');
});
app.get('/menu', function(req, res) {
  //find es el metodo de mongoose para buscar todo los productos, tiene dos parametros
  //ell callback que se ejecuta, o el error si no fue exitoso
  Product.find(function(error, documento) {
    if (error) {
      console.log(error);
    };
    //render tambien puede recibir como parametros variables locales  en forma de objeto,
    //en este caso recibe los documentos devueltos por product.find
    res.render('menu/index', {products: documento});
  });
});

app.put('/menu/:id', middlewareUpload, function(req, res) {
  if (req.body.password == appPassword) {
    //se crea un objeto con los campos recibidos del formulario
    var data = {
      title: req.body.title,
      description: req.body.description,
      pricing: req.body.pricing,
    };
    if (req.file) {
      //se llama a la funcion de cloudinary para subir imagenes
    //el primer parametro es la direccion del archivo que se va a subir, en este caso
    //la direccion esta guardada en la propiedad path del objeto image que crea multer
    //luego de subir la imagen, se corre la funcion con result informando el resultado
    //console.log(req.file);
    cloudinary.uploader.upload(req.file.path, function(result) {
      // se guarda en la base de datos, el parametro err es por si da error
      //result se trae la url en donde va a quedar subida la imagen, y esa es la url
      //que se va a guardar en mongo como url de la imagen del producto
      data.imageUrl = result.url;
      //update para actualizar un elemento
      //el primer parametro es la id del elemento que se va a actualizar
      //el segundo parametro son los nuevos datos que va a actualizar
      //y el tercero el callback
      Product.update({'_id': req.params.id}, data, function(err, success) {
        res.redirect('/menu');
      });
    });
  }else{
    Product.update({'_id': req.params.id}, data, function() {
      res.redirect('/menu');
    });
  };
}else {
  res.redirect('/');
}
});

//:id se pasa asi porque es un parametro que viene en la url que cambia con cada elemento de la base de datos
app.get('/menu/edit/:id', function(req, res) {
  //a traves de params se accede a los parametros de la url
  var id_producto=req.params.id;
  //findone es para buscar en la base de datos, en el modelo Product, el elemento que cumpla con los parametros que se le pasan
  //aqui se busca en el campo _id el id_producto
  Product.findOne({'_id': id_producto}, function(error, producto) {
    res.render('menu/edit', {product: producto});
  });
});

app.post('/admin', function(req, res) {
  if (req.body.password == appPassword) {
    Product.find(function(error, documento) {
      if (error) {
        console.log(error);
      };
    //render tambien puede recibir como parametros variables locales  en forma de objeto,
    //en este caso recibe los documentos devueltos por product.find
    res.render('admin/index', {products: documento});
  });
  } else{
    res.redirect('/');
  }
});

app.get('/admin', function(req, res) {
  res.render('admin/form');
});

//upload. es para decirle al multer que solo se va a subir un archivo (single), y que en el form de html
//el name es 'image'
app.post('/menu', upload.single('image'), function(req, res) {
  //req.body permite mostrar la solicitud req en el body porque el bodyparser la coloca ahi
  //console.log(req.body);
  //req.file es la imagen, ahi la coloca el multer para poder accederla
  //console.log(req.file);
  if (req.body.password == appPassword) {
    // un objeto que cumple con el productschema
    var data = {
      title: req.body.title,
      description: req.body.description,
      pricing: req.body.pricing,
    };
    //  se crea el objeto con modelo Product, pasandole la informacion de data
    var product = new Product(data);
    if (req.file) {
      //se llama a la funcion de cloudinary para subir imagenes
    //el primer parametro es la direccion del archivo que se va a subir, en este caso
    //la direccion esta guardada en la propiedad path del objeto image que crea multer
    //luego de subir la imagen, se corre la funcion con result informando el resultado
    //console.log(req.file);
    cloudinary.uploader.upload(req.file.path, function(result) {
      // se guarda en la base de datos, el parametro err es por si da error
      //result se trae la url en donde va a quedar subida la imagen, y esa es la url
      //que se va a guardar en mongo como url de la imagen del producto
      product.imageUrl = result.url;
      product.save(function(err) {
        console.log(product);
        // luego de la operacion redirige al index
        res.redirect('/menu');
      });
      console.log(result);
    });
  }else {
    product.save(function(err) {
      console.log(product);
        // luego de la operacion redirige al index
        res.redirect('/menu');
      });
  }
}else {
    // si el
    res.render('menu/new');
  };
});

// se acepta una solicitud con metodo get en la ruta menu/new, y se carga la vista
app.get('/menu/new', function(req, res) {
  res.render('menu/new');
});

app.get('/contacto', function(req, res) {
  res.render('contacts');
});

app.get('/menu/delete/:id', function(req, res) {
  var id=req.params.id;
  Product.findOne({'_id': id}, function(err, producto) {
    //el segundo parametro de render son variables que se le pasan al front end
    res.render('menu/delete', {producto: producto});
  });
});

app.delete('/menu/:id', function(req, res) {
  var id=req.params.id;
  if (req.body.password == appPassword) {
    //el metodo removo de mongoose para eliminar elementos de la base de datos
    Product.remove({'_id': id}, function(err) {
      if(err) {
        console.log(err);
      }
    });
    res.redirect('/menu');
  }else {
    res.redirect('/menu');
  }
});
//  se asigna el puerto en el que va a escuchar la aplicacion
//se usa solo app.listen(8080); cuando es local
//app.listen(8080);
// cuando es para produccion, se usa asi, en conjunto con la variable port que se declara al principio.
app.listen(process.env.PORT || 8888);


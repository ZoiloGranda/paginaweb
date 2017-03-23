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
var upload = multer({ dest: 'uploads/' });

// para conectar mongoose a la base de datos
// configuracion inicial de cloudinary, estos valores se sacan del usuario que se crea en la pagina de cloudinary
cloudinary.config({
  cloud_name: 'zgranda',
  api_key: '162961879152527',
  api_secret: 'jIalMZvruz-ECfN-ig7-wntAnkg',
});
//  con esta funcion se crea la aplicacion, y se asigna a la variable app, para poder accederla
var app = express();
mongoose.connect('mongodb://localhost/primera');

var middleware_upload = upload.single('image');
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
var productSchema = {
  title: String,
  description: String,
  imageUrl: String,
  pricing: Number,
};
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
//upload. es para decirle al multer que solo se va a subir un archivo (single), y que en el form de html
//el name es 'image'
app.post('/menu', upload.single('image'), function(req, res) {
  //req.body permite mostrar la solicitud req en el body porque el bodyparser la coloca ahi
  console.log(req.body);
  //req.file es la imagen, ahi la coloca el multer para poder accederla
  console.log(req.file);

  if (req.body.password == '1234') {
    // un objeto que cumple con el productschema
    var data = {
      title: req.body.title,
      description: req.body.description,
      imageUrl: 'imagen.png',
      pricing: req.body.pricing,
    };
    //  se crea el objeto con modelo Product, pasandole la informacion de data
    var product = new Product(data);
    //se llama a la funcion de cloudinary para subir imagenes
    //el primer parametro es la direccion del archivo que se va a subir, en este caso
    //la direccion esta guardada en la propiedad path del objeto image que crea multer
    //luego de subir la imagen, se corre la funcion con result informando el resultado
    console.log(req.file);
    cloudinary.uploader.upload(req.file.path, function(result) {
      // se guarda en la base de datos, el parametro err es por si da error
      //result se trae la url en donde va a quedar subida la imagen, y esa es la url
      //que se va a guardar en mongo como url de la imagen del producto
      product.imageUrl = result.url;
      product.save(function(err) {
        console.log(product);
        // luego de la operacion redirige al index
        res.render('index');
      });
      console.log(result)
    });

  } else {
    console.log('aqui estas');
    // si el
    res.render('menu/new');
  };
});

// se acepta una solicitud con metodo get en la ruta menu/new, y se carga la vista
app.get('/menu/new', function(req, res) {

  res.render('menu/new');
});
//  se asigna el puerto en el que va a escuchar la aplicacion
app.listen(8080);

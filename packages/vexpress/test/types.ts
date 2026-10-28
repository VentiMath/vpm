import express = require('..');
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
const app = express();
createServer(app);
app.use(express.json(), express.urlencoded({ extended: true }), express.static('/tmp'));
app.get('/users/:id', (req, res) => {
  const id: string | string[] | undefined = req.params.id;
  const value: string | undefined = req.get('Accept');
  const cookie: string[] | undefined = req.header('set-cookie');
  res.status(201).json({ id, value, cookie, ip: req.ip });
});
const router = express.Router({ mergeParams: true });
router.get('/child', (req, res) => res.send(req.query)); app.use('/parent', router);
app.route('/x').post((req, res) => res.json(req.body)).delete((req, res) => res.sendStatus(204));
const errorHandler: express.ErrorRequestHandler = (err, req, res, next) => res.status(500).send(err.message);
app.use(errorHandler);
app.param('id', (req, res, next, value) => next());
app.engine('tpl', (file, options, callback) => callback(null, options.name));
app.render('view', { name: 'x' }, (error, html) => { html?.toUpperCase(); });
app.listen(0, '127.0.0.1', error => { error?.message; }).close();
declare const request: IncomingMessage;
declare const response: ServerResponse;
app.handle(request, response);
const typed: express.RequestHandler<{ id: string }, { ok: boolean }, { name: string }, { q: string }> = (req, res) => {
  req.params.id.toUpperCase(); req.body.name.toUpperCase(); req.query.q.toUpperCase(); res.json({ ok: true });
  // @ts-expect-error response body is checked when explicitly parameterized
  res.json({ ok: 'yes' });
};
void typed;
app.post('/typed', typed);
express.json({ verify(req, res, buffer) { req.get('x-signature'); res.set('x-size', buffer.length); } });
express.static('/tmp', { setHeaders(res) { res.set('X-Test', 'yes'); } });
// @ts-expect-error invalid handler
app.get('/bad', 123);
// @ts-expect-error status must be numeric
app.response.status('200');
// @ts-expect-error invalid cookie option
app.response.cookie('name', 'value', { secure: 'yes' });

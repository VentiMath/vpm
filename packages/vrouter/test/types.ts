import Router = require('..');
import { Route } from '..';
import { createServer, IncomingMessage, ServerResponse } from 'node:http';

const router = Router<IncomingMessage, ServerResponse>({ mergeParams: true });
router.get('/users/:id', (req, res, next) => {
  const id: string | string[] | undefined = req.params.id;
  req.socket.address(); res.end(String(id)); next();
});
router.use('/api', [(req, res, next) => { next(); }]);
router.use((req, res, next) => { next(); });
router.use((error: unknown, req: Router.RoutedRequest<IncomingMessage>, res: ServerResponse, next: Router.NextFunction) => {
  res.statusCode = 500; next(error); void req;
});
router.param('id', (req, res, next, value, name) => { void [req.params, res.statusCode, value, name]; next(); });
router.route('/').get((req, res) => res.end(req.url)).post(async (_req, _res, next) => next());
new Router.Route<IncomingMessage, ServerResponse>('/').get((req, res) => res.end(req.url));
new Route('/').get((req, res) => res.end(req.url));
createServer((req, res) => router(req, res, error => { res.end(String(error)); }));
new Router().get('/', (_req, res) => res.end('ok'));
// @ts-expect-error path must be a route string, RegExp or array
router.get(42, () => {});
// @ts-expect-error handlers must be functions
router.use('/x', false);
// @ts-expect-error flags must be booleans
Router({ strict: 'false' });
// @ts-expect-error next callback is required
router({} as IncomingMessage, {} as ServerResponse);

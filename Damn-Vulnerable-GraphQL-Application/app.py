import config
import sys
import os

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_graphql_auth import GraphQLAuth

# Initialize Flask app
app = Flask(__name__, static_folder="static/")
app.secret_key = os.urandom(24)
app.config["SQLALCHEMY_DATABASE_URI"] = config.SQLALCHEMY_DATABASE_URI
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = config.SQLALCHEMY_TRACK_MODIFICATIONS
app.config["UPLOAD_FOLDER"] = config.WEB_UPLOADDIR
app.config['SECRET_KEY'] = 'dvga'
app.config["JWT_SECRET_KEY"] = 'dvga'
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 120
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = 30

# Initialize auth
auth = GraphQLAuth(app)

# WebSocket support for GraphQL subscriptions
app.app_protocol = lambda environ_path_info: 'graphql-ws'

# Initialize database
db = SQLAlchemy(app)

if __name__ == '__main__':
    # Increase recursion limit for deep queries (Qevlar may test high depth)
    sys.setrecursionlimit(100000)

    # Ensure setup is run in non-blocking way
    setup_path = os.path.join(os.path.dirname(__file__), "setup.py")
    if os.path.exists(setup_path):
        os.system(f"{sys.executable} {setup_path}")

    # Import views and GraphQL schema
    from core.views import *
    from gevent import pywsgi
    from geventwebsocket.handler import WebSocketHandler
    from version import VERSION

    # Start server with WebSocket support
    server = pywsgi.WSGIServer(
        (config.WEB_HOST, int(config.WEB_PORT)),
        app,
        handler_class=WebSocketHandler
    )
    print(f"✅ DVGA Server Version: {VERSION} Running at http://{config.WEB_HOST}:{config.WEB_PORT}/graphql")
    server.serve_forever()

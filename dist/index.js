"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _path = require("path");

var _pluginSyntaxJsx = _interopRequireDefault(require("@babel/plugin-syntax-jsx"));

var _types = _interopRequireDefault(require("@babel/types"));

var _ajvKeywords = _interopRequireDefault(require("ajv-keywords"));

var _ajv = _interopRequireDefault(require("ajv"));

var _optionsSchema = _interopRequireDefault(require("./schemas/optionsSchema.json"));

var _optionsDefaults = _interopRequireDefault(require("./schemas/optionsDefaults"));

var _createObjectExpression = _interopRequireDefault(require("./createObjectExpression"));

var _requireCssModule = _interopRequireDefault(require("./requireCssModule"));

var _resolveStringLiteral = _interopRequireDefault(require("./resolveStringLiteral"));

var _replaceJsxExpressionContainer = _interopRequireDefault(require("./replaceJsxExpressionContainer"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const ajv = new _ajv.default({
  // eslint-disable-next-line id-match
  $data: true
});
(0, _ajvKeywords.default)(ajv);
const validate = ajv.compile(_optionsSchema.default);

var _default = (_ref) => {
  let t = _ref.types;
  const filenameMap = {};

  const setupFileForRuntimeResolution = (path, filename) => {
    const programPath = path.findParent(parentPath => {
      return parentPath.isProgram();
    });
    filenameMap[filename].importedHelperIndentifier = programPath.scope.generateUidIdentifier('getClassName');
    filenameMap[filename].styleModuleImportMapIdentifier = programPath.scope.generateUidIdentifier('styleModuleImportMap');
    programPath.unshiftContainer('body', t.importDeclaration([t.importDefaultSpecifier(filenameMap[filename].importedHelperIndentifier)], t.stringLiteral('babel-plugin-react-css-modules/dist/browser/getClassName')));
    const firstNonImportDeclarationNode = programPath.get('body').find(node => {
      return !t.isImportDeclaration(node);
    });
    firstNonImportDeclarationNode.insertBefore(t.variableDeclaration('const', [t.variableDeclarator(filenameMap[filename].styleModuleImportMapIdentifier, (0, _createObjectExpression.default)(t, filenameMap[filename].styleModuleImportMap))])); // eslint-disable-next-line
    // console.log('setting up', filename, util.inspect(filenameMap,{depth: 5}))
  };

  const addWebpackHotModuleAccept = path => {
    const test = t.memberExpression(t.identifier('module'), t.identifier('hot'));
    const consequent = t.blockStatement([t.expressionStatement(t.callExpression(t.memberExpression(t.memberExpression(t.identifier('module'), t.identifier('hot')), t.identifier('accept')), [t.stringLiteral(path.node.source.value), t.functionExpression(null, [], t.blockStatement([t.expressionStatement(t.callExpression(t.identifier('require'), [t.stringLiteral(path.node.source.value)]))]))]))]);
    const programPath = path.findParent(parentPath => {
      return parentPath.isProgram();
    });
    const firstNonImportDeclarationNode = programPath.get('body').find(node => {
      return !t.isImportDeclaration(node);
    });
    const hotAcceptStatement = t.ifStatement(test, consequent);

    if (firstNonImportDeclarationNode) {
      firstNonImportDeclarationNode.insertBefore(hotAcceptStatement);
    } else {
      programPath.pushContainer('body', hotAcceptStatement);
    }
  };

  const getTargetResourcePath = (path, stats) => {
    const targetFileDirectoryPath = (0, _path.dirname)(stats.file.opts.filename);

    if (path.node.source.value.startsWith('.')) {
      return (0, _path.resolve)(targetFileDirectoryPath, path.node.source.value);
    }

    return require.resolve(path.node.source.value);
  };

  const notForPlugin = (path, stats) => {
    stats.opts.filetypes = stats.opts.filetypes || {};
    const extension = path.node.source.value.lastIndexOf('.') > -1 ? path.node.source.value.substr(path.node.source.value.lastIndexOf('.')) : null;

    if (extension !== '.css' && Object.keys(stats.opts.filetypes).indexOf(extension) < 0) {
      return true;
    }

    if (stats.opts.exclude && getTargetResourcePath(path, stats).match(new RegExp(stats.opts.exclude))) {
      return true;
    }

    return false;
  };

  return {
    inherits: _pluginSyntaxJsx.default,
    visitor: {
      ImportDeclaration(path, stats) {
        if (notForPlugin(path, stats)) {
          return;
        }

        const filename = stats.file.opts.filename;
        const targetResourcePath = getTargetResourcePath(path, stats);
        let styleImportName;

        if (path.node.specifiers.length === 0) {
          // use imported file path as import name
          styleImportName = path.node.source.value;
        } else if (path.node.specifiers.length === 1) {
          styleImportName = path.node.specifiers[0].local.name;
        } else {
          // eslint-disable-next-line no-console
          console.warn('Please report your use case. https://github.com/gajus/babel-plugin-react-css-modules/issues/new?title=Unexpected+use+case.');
          throw new Error('Unexpected use case.');
        }

        filenameMap[filename].styleModuleImportMap[styleImportName] = (0, _requireCssModule.default)(targetResourcePath, {
          context: stats.opts.context,
          filetypes: stats.opts.filetypes || {},
          generateScopedName: stats.opts.generateScopedName
        });

        if (stats.opts.webpackHotModuleReloading) {
          addWebpackHotModuleAccept(path);
        }

        if (stats.opts.removeImport) {
          path.remove();
        }
      },

      JSXElement(path, stats) {
        const filename = stats.file.opts.filename;
        const styleNameAttribute = path.node.openingElement.attributes.find(attribute => {
          return typeof attribute.name !== 'undefined' && attribute.name.name === 'styleName';
        });

        if (!styleNameAttribute) {
          return;
        }

        const handleMissingStyleName = stats.opts && stats.opts.handleMissingStyleName || _optionsDefaults.default.handleMissingStyleName;

        if (t.isStringLiteral(styleNameAttribute.value)) {
          (0, _resolveStringLiteral.default)(path, filenameMap[filename].styleModuleImportMap, styleNameAttribute, {
            handleMissingStyleName
          });
          return;
        }

        if (t.isJSXExpressionContainer(styleNameAttribute.value)) {
          if (!filenameMap[filename].importedHelperIndentifier) {
            setupFileForRuntimeResolution(path, filename);
          }

          (0, _replaceJsxExpressionContainer.default)(t, path, styleNameAttribute, filenameMap[filename].importedHelperIndentifier, filenameMap[filename].styleModuleImportMapIdentifier, {
            handleMissingStyleName
          });
        }
      },

      Program(path, stats) {
        if (!validate(stats.opts)) {
          // eslint-disable-next-line no-console
          console.error(validate.errors);
          throw new Error('Invalid configuration');
        }

        const filename = stats.file.opts.filename;
        filenameMap[filename] = {
          styleModuleImportMap: {}
        };
      }

    }
  };
};

exports.default = _default;
//# sourceMappingURL=index.js.map
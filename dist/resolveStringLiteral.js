"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _types = require("@babel/types");

var _conditionalClassMerge = _interopRequireDefault(require("./conditionalClassMerge"));

var _getClassName = _interopRequireDefault(require("./getClassName"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Updates the className value of a JSX element using a provided styleName attribute.
 */
var _default = (path, styleModuleImportMap, styleNameAttribute, options) => {
  const classNameAttribute = path.node.openingElement.attributes.find(attribute => {
    return typeof attribute.name !== 'undefined' && attribute.name.name === 'className';
  });
  const resolvedStyleName = (0, _getClassName.default)(styleNameAttribute.value.value, styleModuleImportMap, options);

  if (classNameAttribute) {
    if ((0, _types.isStringLiteral)(classNameAttribute.value)) {
      classNameAttribute.value.value += ' ' + resolvedStyleName;
    } else if ((0, _types.isJSXExpressionContainer)(classNameAttribute.value)) {
      classNameAttribute.value.expression = (0, _conditionalClassMerge.default)(classNameAttribute.value.expression, (0, _types.stringLiteral)(resolvedStyleName));
    } else {
      throw new Error('Unexpected attribute value.');
    }

    path.node.openingElement.attributes.splice(path.node.openingElement.attributes.indexOf(styleNameAttribute), 1);
  } else {
    styleNameAttribute.name.name = 'className';
    styleNameAttribute.value.value = resolvedStyleName;
  }
};

exports.default = _default;
//# sourceMappingURL=resolveStringLiteral.js.map
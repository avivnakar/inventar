"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

function __spreadArrays() {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++) for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, 
    k++) r[k] = a[j];
    return r;
}

var camelCase2KebabCase = function(str) {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, "$1-$2").toLowerCase();
};

var cssVars2StyleString = function(config) {
    return Object.entries(config).map((function(_a) {
        var name = _a[0], value = _a[1];
        return name + ": " + value;
    })).join(";");
};

var injectToStyle = function(formattedConfig, domEl) {
    var styleString = cssVars2StyleString(formattedConfig);
    domEl.setAttribute("style", styleString);
};

var injectToRoot = function(formattedConfig) {
    var formattedConfigPairs = Object.entries(formattedConfig);
    formattedConfigPairs.forEach((function(_a) {
        var name = _a[0], value = _a[1];
        return document.documentElement.style.setProperty(name, String(value));
    }));
};

var DEFAULT_OPTIONS = {
    cssVarsInjector: injectToStyle,
    js2CssNameFormatter: camelCase2KebabCase,
    shouldMakeCssInventar: true
};

var mergeOptionsWithDefaults = function(options) {
    return __assign(__assign({}, DEFAULT_OPTIONS), options);
};

var isDerivative = function(val) {
    return (val === null || val === void 0 ? void 0 : val.constructor) === Function;
};

var isValueWithValueObject = function(val) {
    return Object.keys(val).includes("value");
};

var isValueTransformersOnlyObject = function(val) {
    var _a;
    return ((_a = val === null || val === void 0 ? void 0 : val.transformers) === null || _a === void 0 ? void 0 : _a.constructor) === Array && val.transformers.length > 0 && !Object.keys(val).includes("value");
};

var isValueObject = function(val) {
    return isValueWithValueObject(val) || isValueTransformersOnlyObject(val);
};

var isFieldName = function(val) {
    return (val === null || val === void 0 ? void 0 : val.constructor) === String;
};

var isValue = function(val) {
    return (val === null || val === void 0 ? void 0 : val.constructor) === String || (val === null || val === void 0 ? void 0 : val.constructor) === Number;
};

var isEntryTuple = function(val) {
    return (val === null || val === void 0 ? void 0 : val.constructor) === Array && val.length === 2 && isFieldName(val[0]) && isValue(val[1]);
};

var isTransformer = function(val) {
    return (val === null || val === void 0 ? void 0 : val.constructor) === Function;
};

var isTransformerObject = function(val) {
    return isTransformer(val === null || val === void 0 ? void 0 : val.transformer);
};

var isTesterFunction = function(val) {
    return (val === null || val === void 0 ? void 0 : val.constructor) === Function;
};

var ResolveError = function() {
    return "Failed to resolve the provided configuration. It might contains a circular dependency, or a reference to an undefined field.";
};

var fieldDoesntExistYetError = function(fieldName) {
    return "The field " + String(fieldName) + " doesn't exist (yet?)";
};

var FILTER_NONE_REGEXP = /.*/;

var createThrowIfEmptyFieldObject = function(starterObject) {
    return new Proxy(starterObject, {
        get: function(target, prop) {
            if (!target[prop]) {
                throw new Error(fieldDoesntExistYetError(prop));
            }
            return target[prop];
        }
    });
};

var testTuple = function(tester, tuple) {
    return isTesterFunction(tester) ? tester(tuple) : tester.test(String(tuple[0]));
};

var createTuplesFromTransformers = function(valueTuple, _a) {
    var _b = _a === void 0 ? [] : _a, currentTransformer = _b[0], restOfTransformers = _b.slice(1);
    if (!currentTransformer) {
        return [ valueTuple ];
    }
    var transformerFunction = isTransformerObject(currentTransformer) ? currentTransformer.transformer : currentTransformer;
    var transformerTest = isTransformerObject(currentTransformer) && currentTransformer.test || FILTER_NONE_REGEXP;
    return testTuple(transformerTest, valueTuple) ? transformerFunction(valueTuple).map((function(newTuple) {
        return createTuplesFromTransformers(newTuple, restOfTransformers);
    })) : [ valueTuple ];
};

var flattenTransformedTuples = function(tuples, aggregator) {
    if (aggregator === void 0) {
        aggregator = [];
    }
    return tuples.reduce((function(agg, item) {
        if (isEntryTuple(item)) {
            agg.push(item);
        } else {
            flattenTransformedTuples(item, aggregator);
        }
        return agg;
    }), aggregator);
};

var resolve = function(config, value) {
    return isDerivative(value) ? value(config) : value;
};

var resolveTuple = function(config, name, value) {
    return [ resolve(config, name), resolve(config, value) ];
};

var resolveDependencies = function(initialData, options) {
    var preTransformers = (options === null || options === void 0 ? void 0 : options.preTransformers) || [];
    var postTransformers = (options === null || options === void 0 ? void 0 : options.postTransformers) || [];
    var doesGlobalTransformersExist = !!(preTransformers.length || postTransformers.length);
    var processQueue = Object.entries(initialData);
    var resolvedConfig = {};
    var errorThrowingResolvedConfig = createThrowIfEmptyFieldObject(resolvedConfig);
    var resolveWithConfig = resolveTuple.bind(null, errorThrowingResolvedConfig);
    var cycleDetect = 0;
    while (processQueue.length && cycleDetect <= processQueue.length) {
        var currentPair = processQueue.shift();
        var name_1 = currentPair[0], rawValue = currentPair[1];
        try {
            if (doesGlobalTransformersExist || isValueObject(rawValue)) {
                var valueFieldOfObject = isValueWithValueObject(rawValue) ? rawValue.value : undefined;
                var value = valueFieldOfObject || (isValueTransformersOnlyObject(rawValue) ? undefined : rawValue);
                var resolvedTuple = resolveWithConfig(name_1, value);
                var valueTransformers = isValueObject(rawValue) && rawValue.transformers || [];
                var allTransformers = __spreadArrays(preTransformers, valueTransformers, postTransformers);
                var transformedValues = createTuplesFromTransformers(resolvedTuple, allTransformers);
                var flattenedTransformedValues = flattenTransformedTuples(transformedValues);
                flattenedTransformedValues.forEach((function(_a) {
                    var newName = _a[0], newValue = _a[1];
                    resolvedConfig[newName] = newValue;
                }));
            } else {
                var _a = resolveWithConfig(name_1, rawValue), resolvedName = _a[0], resolvedValue = _a[1];
                resolvedConfig[resolvedName] = resolvedValue;
            }
            cycleDetect = 0;
        } catch (e) {
            processQueue.push(currentPair);
            cycleDetect += 1;
        }
    }
    if (cycleDetect) {
        throw new Error(ResolveError());
    }
    return __assign({}, resolvedConfig);
};

var resolveConfig = function(rawConfig) {
    var resolvedConfig = resolveDependencies(rawConfig);
    return Object.freeze(resolvedConfig);
};

var config2CssVars = function(config, options) {
    if (options === void 0) {
        options = {};
    }
    var _a = mergeOptionsWithDefaults(options), js2CssNameFormatter = _a.js2CssNameFormatter, cssVarsInjector = _a.cssVarsInjector;
    var resolvedCssVars = Object.entries(config).reduce((function(agg, _a) {
        var name = _a[0], value = _a[1];
        var cssVarName = "--" + js2CssNameFormatter(name);
        agg[cssVarName] = value;
        return agg;
    }), {});
    var inject = cssVarsInjector.bind(null, resolvedCssVars);
    return {
        cssInventar: Object.freeze(resolvedCssVars),
        inject: inject
    };
};

var makeInventar = function(config, options) {
    if (options === void 0) {
        options = {};
    }
    var optionsWithDefaults = mergeOptionsWithDefaults(options);
    var jsInventar = resolveConfig(config);
    var cssInventarObject = optionsWithDefaults.shouldMakeCssInventar ? config2CssVars(jsInventar, optionsWithDefaults) : {};
    return __assign({
        jsInventar: jsInventar
    }, cssInventarObject);
};

exports.camelCase2KebabCase = camelCase2KebabCase;

exports.default = makeInventar;

exports.injectToRoot = injectToRoot;

exports.injectToStyle = injectToStyle;

exports.isDerivative = isDerivative;

exports.isEntryTuple = isEntryTuple;

exports.isValueObject = isValueObject;

exports.makeInventar = makeInventar;
//# sourceMappingURL=inventar.js.map

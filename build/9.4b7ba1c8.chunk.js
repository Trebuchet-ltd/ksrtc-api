(window.webpackJsonp=window.webpackJsonp||[]).push([[9],{2297:function(e,t,n){"use strict";var a=n(7),u=n(0);Object.defineProperty(t,"__esModule",{value:!0}),t.default=void 0;var l=u(n(6)),r=a(n(1)),c=n(35),o=n(8),i=(0,r.lazy)((function(){return Promise.all([n.e(1),n.e(2)]).then(n.t.bind(null,2367,7))})),d=(0,r.lazy)((function(){return n.e(0).then(n.t.bind(null,2295,7))})),f=function(e){var t=(0,c.useRouteMatch)().url,n=(0,c.useParams)().slug,a=function(t,a){return r.default.createElement(a,(0,l.default)({},e,t,{slug:n}))},u=[{path:"ctm-configurations/edit-settings/:type",comp:d},{path:"",comp:i}].map((function(e){var n=e.path,u=e.comp;return r.default.createElement(c.Route,{key:n,path:"".concat(t,"/").concat(n),render:function(e){return a(e,u)}})}));return r.default.createElement(r.Suspense,{fallback:r.default.createElement(o.LoadingIndicatorPage,null)},r.default.createElement(c.Switch,null,u))};t.default=f}}]);
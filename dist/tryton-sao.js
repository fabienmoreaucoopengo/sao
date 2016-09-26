/* This file is part of Tryton.  The COPYRIGHT file at the top level of
   this repository contains the full copyright notices and license terms. */
var Sao = {};

(function() {
    'use strict';

    // Browser compatibility: polyfill
    if (!('contains' in String.prototype)) {
        String.prototype.contains = function(str, startIndex) {
            return -1 !== String.prototype.indexOf.call(this, str, startIndex);
        };
    }
    if (!String.prototype.startsWith) {
        Object.defineProperty(String.prototype, 'startsWith', {
            enumerable: false,
            configurable: false,
            writable: false,
            value: function(searchString, position) {
                position = position || 0;
                return this.indexOf(searchString, position) === position;
            }
        });
    }
    if (!String.prototype.endsWith) {
        Object.defineProperty(String.prototype, 'endsWith', {
            enumerable: false,
            configurable: false,
            writable: false,
            value: function(searchString, position) {
                position = position || this.length;
                position = position - searchString.length;
                var lastIndex = this.lastIndexOf(searchString);
                return lastIndex !== -1 && lastIndex === position;
            }
        });
    }
    if (!Array.prototype.some) {
        Array.prototype.some = function(fun /*, thisp */) {
            if (this === null) {
                throw new TypeError();
            }
            var thisp, i,
                t = Object(this),
                len = t.length >>> 0;
            if (typeof fun !== 'function') {
                throw new TypeError();
            }
            thisp = arguments[1];
            for (i = 0; i < len; i++) {
                if (i in t && fun.call(thisp, t[i], i, t)) {
                    return true;
                }
            }
            return false;
        };
    }

    // Ensure RichText doesn't use style with css
    try {
        document.execCommand('styleWithCSS', false, false);
    } catch (e) {
    }
    try {
        document.execCommand('useCSS', false, true);
    } catch (e) {
    }

    // Add .uniqueId to jQuery
    jQuery.fn.extend({
        uniqueId: (function() {
            var uuid = 0;
            return function() {
                return this.each(function() {
                    if (!this.id) {
                        this.id = "ui-id-" + (++uuid);
                    }
                });
            };
        })()
    });

    Sao.class_ = function(Parent, props) {
        var ClassConstructor = function() {
            if (!(this instanceof ClassConstructor))
                throw new Error('Constructor function requires new operator');
            this.Class = ClassConstructor;
            if (this.init) {
                this.init.apply(this, arguments);
            }
        };

        // Plug prototype chain
        ClassConstructor.prototype = Object.create(Parent.prototype);
        ClassConstructor._super = Parent.prototype;
        if (props) {
            for (var name in props) {
                ClassConstructor.prototype[name] = props[name];
            }
        }
        return ClassConstructor;
    };

    Sao.Decimal = Number;

    Sao.Date = function(year, month, day) {
        var date = moment();
        date.year(year);
        date.month(month);
        date.date(day);
        date.set({hour: 0, minute: 0, second: 0, millisecond: 0});
        date.isDate = true;
        return date;
    };

    Sao.Date.min = moment(new Date(-100000000 * 86400000));
    Sao.Date.min.set({hour: 0, minute: 0, second: 0, millisecond: 0});
    Sao.Date.min.isDate = true;
    Sao.Date.max = moment(new Date(100000000 * 86400000));
    Sao.Date.max.set({hour: 0, minute: 0, second: 0, millisecond: 0});
    Sao.Date.max.isDate = true;

    Sao.DateTime = function(year, month, day, hour, minute, second,
            millisecond, utc) {
        // [Bug Sao] - handle all values to null
        // TODO: report to tryton
        var datetime;
        if ((month === undefined || month === null) &&
            (year !== undefined && year !== null)) {
            datetime = moment(year);
            year = undefined;
        }
        else {
            datetime = moment();
        }
        if (utc) {
            datetime.utc();
        }
        datetime.year(year);
        datetime.month(month);
        datetime.date(day);
        if (month !== undefined && month !== null) {
            datetime.hour(hour || 0);
            datetime.minute(minute || 0);
            datetime.second(second || 0);
            datetime.milliseconds(millisecond || 0);
        }
        datetime.isDateTime = true;
        datetime.local();
        return datetime;
    };

    Sao.DateTime.combine = function(date, time) {
        var datetime = date.clone();
        datetime.set({hour: time.hour(), minute: time.minute(),
            second: time.second(), millisecond: time.millisecond()});
        datetime.isDateTime = true;
        return datetime;
    };

    Sao.DateTime.min = moment(new Date(-100000000 * 86400000)).local();
    Sao.DateTime.min.isDateTime = true;
    Sao.DateTime.max = moment(new Date(100000000 * 86400000)).local();
    Sao.DateTime.max.isDateTime = true;

    Sao.Time = function(hour, minute, second, millisecond) {
        var time = moment({hour: hour, minute: minute, second: second,
           millisecond: millisecond || 0});
        time.isTime = true;
        return time;
    };

    Sao.TimeDelta = function(days, seconds,
            milliseconds, minutes, hours, weeks) {
        var timedelta = moment.duration({
            days: days,
            seconds: seconds,
            milliseconds: milliseconds,
            minutes: minutes,
            hours: hours,
            weeks: weeks
        });
        timedelta.isTimeDelta = true;
        return timedelta;
    };

    Sao.config = {};
    Sao.config.limit = 1000;
    Sao.config.display_size = 20;
    Sao.config.roundup = {};
    Sao.config.roundup.url = 'http://bugs.tryton.org/roundup/';

    Sao.i18n = i18n();
    Sao.i18n.setlang = function(lang) {
        Sao.i18n.setLocale(lang);
        return jQuery.getJSON('locale/' + lang + '.json', function(data) {
            if (!data[''].language) {
                data[''].language = lang;
            }
            if (!data['']['plural-forms']) {
                data['']['plural-forms'] = 'nplurals=2; plural=(n!=1);';
            }
            // gettext.js requires to dump untranslated keys
            for (var key in data) {
                if ('' === key) {
                    continue;
                }
                data[key] = 2 == data[key].length ? data[key][1] : data[key].slice(1);
            }
            Sao.i18n.loadJSON(data);
        });
    };
    Sao.i18n.setlang(
            (navigator.language ||
             navigator.browserLanguge ||
             navigator.userLanguage ||
             'en_US').replace('-', '_'));

    Sao.get_preferences = function() {
        var session = Sao.Session.current_session;
        return session.reload_context().then(function() {
            return Sao.rpc({
                'method': 'model.res.user.get_preferences',
                'params': [false, {}]
            }, session).then(function(preferences) {
                var deferreds = [];
                deferreds.push(Sao.common.MODELACCESS.load_models());
                deferreds.push(Sao.common.ICONFACTORY.load_icons());
                deferreds.push(Sao.common.MODELHISTORY.load_history());
                deferreds.push(Sao.common.VIEW_SEARCH.load_searches());
                return jQuery.when.apply(jQuery, deferreds).then(function() {
                    (preferences.actions || []).forEach(function(action_id) {
                        Sao.Action.execute(action_id, {}, null, {});
                    });
                    var title = 'Coog';
                    if (!jQuery.isEmptyObject(preferences.status_bar)) {
                        title += ' - ' + preferences.status_bar;
                    }
                    document.title = title;
                    var new_lang = preferences.language != Sao.i18n.getLocale();
                    var prm = jQuery.Deferred();
                    Sao.i18n.setlang(preferences.language).always(function() {
                        if (new_lang) {
                            Sao.user_menu(preferences);
                        }
                        prm.resolve(preferences);
                    });
                    return prm;
                });
            });
        });
    };

    Sao.login = function() {
        Sao.Session.get_credentials()
            .then(function(session) {
                Sao.Session.current_session = session;
                return session.reload_context();
            }).then(Sao.get_preferences).then(function(preferences) {
                Sao.menu(preferences);
                Sao.user_menu(preferences);
            });
    };

    Sao.logout = function() {
        var session = Sao.Session.current_session;
        Sao.Tab.tabs.close(true).done(function() {
            jQuery('#user-preferences').children().remove();
            jQuery('#user-logout').children().remove();
            jQuery('#menu').children().remove();
            document.title = 'Coog';
            session.do_logout().always(Sao.login);
        });
    };

    Sao.preferences = function() {
        Sao.Tab.tabs.close(true).done(function() {
            jQuery('#user-preferences').children().remove();
            jQuery('#user-logout').children().remove();
            jQuery('#menu').children().remove();
            new Sao.Window.Preferences(function() {
                Sao.get_preferences().then(function(preferences) {
                    Sao.menu(preferences);
                    Sao.user_menu(preferences);
                });
            });
        });
    };

    Sao.user_menu = function(preferences) {
        jQuery('#user-preferences').children().remove();
        jQuery('#user-logout').children().remove();
        jQuery('#user-preferences').append(jQuery('<a/>', {
            'href': '#'
        }).click(Sao.preferences).append(preferences.status_bar));
        jQuery('#user-logout').append(jQuery('<a/>', {
            'href': '#'
        }).click(Sao.logout).append(Sao.i18n.gettext('Logout')));
    };

    Sao.menu = function(preferences) {
        var decoder = new Sao.PYSON.Decoder();
        var action = decoder.decode(preferences.pyson_menu);
        var view_ids = false;
        if (!jQuery.isEmptyObject(action.views)) {
            view_ids = action.views.map(function(view) {
                return view[0];
            });
        } else if (action.view_id) {
            view_ids = [action.view_id[0]];
        }
        decoder = new Sao.PYSON.Decoder(Sao.Session.current_session.context);
        var action_ctx = decoder.decode(action.pyson_context || '{}');
        var domain = decoder.decode(action.pyson_domain);
        var form = new Sao.Tab.Form(action.res_model, {
            'mode': ['tree'],
            'view_ids': view_ids,
            'domain': domain,
            'context': action_ctx,
            'selection_mode': Sao.common.SELECTION_SINGLE
        });
        Sao.Tab.tabs.splice(Sao.Tab.tabs.indexOf(form), 1);
        form.view_prm.done(function() {
            Sao.main_menu_screen = form.screen;
            var view = form.screen.current_view;
            view.table.find('thead').hide();
            jQuery('#menu').children().remove();

            var gs = new Sao.GlobalSearch();
            jQuery('#menu').append(gs.el);
            jQuery('#menu').append(
                form.screen.screen_container.content_box.detach());
        });
    };
    Sao.main_menu_screen = null;

    Sao.Dialog = Sao.class_(Object, {
        init: function(title, class_, size) {
            size = size || 'sm';
            this.modal = jQuery('<div/>', {
                'class': class_ + ' modal fade',
                'role': 'dialog'
            });
            this.content = jQuery('<form/>', {
                'class': 'modal-content'
            }).appendTo(jQuery('<div/>', {
                'class': 'modal-dialog modal-' + size
            }).appendTo(this.modal));
            this.header = jQuery('<div/>', {
                'class': 'modal-header'
            }).appendTo(this.content);
            if (title) {
                this.add_title(title);
            }
            this.body = jQuery('<div/>', {
                'class': 'modal-body'
            }).appendTo(this.content);
            this.footer = jQuery('<div/>', {
                'class': 'modal-footer'
            }).appendTo(this.content);
        },
        add_title: function(title) {
            this.header.append(jQuery('<h4/>', {
                'class': 'modal-title'
            }).append(title));
        }
    });

    Sao.GlobalSearch = Sao.class_(Object, {
        init: function() {
            this.el = jQuery('<div/>', {
                'class': 'global-search-container'
            });
            this.search_entry = jQuery('<input>', {
                'class': 'form-control',
                'placeholder': Sao.i18n.gettext('Search...')
            });
            this.el.append(this.search_entry);
            var completion = new Sao.common.InputCompletion(
                    this.search_entry,
                    this.update.bind(this),
                    this.match_selected.bind(this),
                    this.format.bind(this));
        },
        format: function(content) {
            var el = jQuery('<div/>');
            var img = jQuery('<img/>', {
                'class': 'global-search-icon'
            }).appendTo(el);
            Sao.common.ICONFACTORY.register_icon(content.icon).then(
                    function(icon_url) {
                        img.attr('src', icon_url);
                    });
            jQuery('<span/>', {
                'class': 'global-search-text'
            }).text(content.record_name).appendTo(el);
            return el;
        },
        update: function(text) {
            var ir_model = new Sao.Model('ir.model');
            return ir_model.execute('global_search',
                    [text, Sao.config.limit, Sao.main_menu_screen.model_name],
                    Sao.main_menu_screen.context).then(function(s_results) {
                var results = [];
                for (var i=0, len=s_results.length; i < len; i++) {
                    results.push({
                        'model': s_results[i][1],
                        'model_name': s_results[i][2],
                        'record_id': s_results[i][3],
                        'record_name': s_results[i][4],
                        'icon': s_results[i][5],
                    });
                }
                return results;
            }.bind(this));
        },
        match_selected: function(item) {
            if (item.model == Sao.main_menu_screen.model_name) {
                Sao.Action.exec_keyword('tree_open', {
                    'model': item.model,
                    'id': item.record_id,
                    'ids': [item.record_id]
                }, Sao.main_menu_screen.context);
            } else {
                var params = {
                    'model': item.model,
                    'res_id': item.record_id,
                    'mode': ['form', 'tree']
                };
                Sao.Tab.create(params);
            }
            this.search_entry.val('');
        }
    });

    // Fix stacked modal
    jQuery(document)
        .on('show.bs.modal', '.modal', function(event) {
            jQuery(this).appendTo(jQuery('body'));
        })
    .on('shown.bs.modal', '.modal.in', function(event) {
        setModalsAndBackdropsOrder();
    })
    .on('hidden.bs.modal', '.modal', function(event) {
        setModalsAndBackdropsOrder();
    });

    function setModalsAndBackdropsOrder() {
        var modalZIndex = 1040;
        jQuery('.modal.in').each(function(index) {
            var $modal = jQuery(this);
            modalZIndex++;
            $modal.css('zIndex', modalZIndex);
            var visible_height = jQuery(window).height() * 0.8;
            var modal_body = $modal.find('.modal-body');
            if (modal_body.height() > visible_height) {
                modal_body.addClass('scrollable-modal');
                modal_body.css('max-height', visible_height);
            }
            $modal.next('.modal-backdrop.in').addClass('hidden')
            .css('zIndex', modalZIndex - 1);
        });
        jQuery('.modal.in:visible:last').focus()
        .next('.modal-backdrop.in').removeClass('hidden');
    }
}());

/* This file is part of Tryton.  The COPYRIGHT file at the top level of
   this repository contains the full copyright notices and license terms. */
(function() {
    'use strict';

    Sao.rpc = function(args, session) {
        var dfd = jQuery.Deferred();
        if (!session) {
            session = new Sao.Session();
        }
        var params = jQuery.extend([], args.params);
        params.push(jQuery.extend({}, session.context, params.pop()));

        var timeoutID = Sao.common.processing.show();
        var ajax_prm = jQuery.ajax({
            'headers': {
                'Authorization': 'Session ' + session.get_auth()
            },
            'contentType': 'application/json',
            'data': JSON.stringify(Sao.rpc.prepareObject({
                'method': args.method,
                'params': params
            })),
            'dataType': 'json',
            'url': '/' + (session.database || '') + '/',
            'type': 'post',
            'complete': [function() {
                Sao.common.processing.hide(timeoutID);
            }]
        });

        var ajax_success = function(data) {
            if (data === null) {
                Sao.common.warning.run('',
                        Sao.i18n.gettext('Unable to reach the server'));
                dfd.reject();
            } else if (data.error) {
                var name, msg, description;
                if (data.error[0] == 'UserWarning') {
                    name = data.error[1][0];
                    msg = data.error[1][1];
                    description = data.error[1][2];
                    Sao.common.userwarning.run(msg, description)
                        .done(function(result) {
                            if (!~['always', 'ok'].indexOf(result)) {
                                dfd.reject();
                                return;
                            }
                            Sao.rpc({
                                'method': 'model.res.user.warning.create',
                                'params': [[{
                                    'user': session.user_id,
                                    'name': name,
                                    'always': result == 'always'
                                }], {}]
                            }, session).done(function() {
                                Sao.rpc(args, session).then(
                                    dfd.resolve, dfd.reject);
                            });
                        });
                    return;
                } else if (data.error[0] == 'UserError') {
                    msg = data.error[1][0];
                    description = data.error[1][1];
                    Sao.common.warning.run(msg, description)
                        .always(dfd.reject);
                    return;
                } else if (data.error[0] == 'ConcurrencyException') {
                    if (args.method.startsWith('model.') &&
                            (args.method.endsWith('.write') ||
                             args.method.endsWith('.delete'))) {
                        var model = args.method.split('.').slice(1, -1).join('.');
                        Sao.common.concurrency.run(model, args.params[0][0],
                                args.params.slice(-1)[0])
                            .then(function() {
                                delete args.params.slice(-1)[0]._timestamp;
                                Sao.rpc(args, session).then(
                                    dfd.resolve, dfd.reject);
                            }, dfd.reject);
                        return;
                    } else {
                        Sao.common.message.run('Concurrency Exception',
                                'glyphicon-alert').always(dfd.reject);
                        return;
                    }
                } else if (data.error[0].startsWith('403')) {
                    //Try to relog
                    Sao.Session.renew(session).then(function() {
                        Sao.rpc(args, session).then(dfd.resolve, dfd.reject);
                    }, dfd.reject);
                    return;
                } else {
                    Sao.common.error.run(data.error[0], data.error[1]);
                }
                dfd.reject();
            } else {
                dfd.resolve(data.result);
            }
        };

        var ajax_error = function(query, status_, error) {
            Sao.common.error.run(status_, error);
            dfd.reject();
        };
        ajax_prm.success(ajax_success);
        ajax_prm.error(ajax_error);

        return dfd.promise();
    };

    Sao.rpc.convertJSONObject = function(value, index, parent) {
       if (value instanceof Array) {
           for (var i = 0, length = value.length; i < length; i++) {
               Sao.rpc.convertJSONObject(value[i], i, value);
           }
       } else if ((typeof(value) != 'string') &&
           (typeof(value) != 'number') && (value !== null)) {
           if (value && value.__class__) {
               switch (value.__class__) {
                   case 'datetime':
                       value = Sao.DateTime(value.year,
                               value.month - 1, value.day, value.hour,
                               value.minute, value.second,
                               value.microsecond / 1000, true);
                       break;
                   case 'date':
                       value = Sao.Date(value.year,
                           value.month - 1, value.day);
                       break;
                   case 'time':
                       value = Sao.Time(value.hour, value.minute,
                               value.second, value.microsecond / 1000);
                       break;
                    case 'timedelta':
                       value = Sao.TimeDelta(null, value.seconds);
                       break;
                   case 'bytes':
                       // javascript's atob does not understand linefeed
                       // characters
                       var byte_string = atob(value.base64.replace(/\s/g, ''));
                       // javascript decodes base64 string as a "DOMString", we
                       // need to convert it to an array of bytes
                       var array_buffer = new ArrayBuffer(byte_string.length);
                       var uint_array = new Uint8Array(array_buffer);
                       for (var j=0; j < byte_string.length; j++) {
                           uint_array[j] = byte_string.charCodeAt(j);
                       }
                       value = uint_array;
                       break;
                   case 'Decimal':
                       value = new Sao.Decimal(value.decimal);
                       break;
               }
               if (parent) {
                   parent[index] = value;
               }
           } else {
               for (var p in value) {
                   Sao.rpc.convertJSONObject(value[p], p, value);
               }
           }
       }
       return parent || value;
    };

    Sao.rpc.prepareObject = function(value, index, parent) {
        if (value instanceof Array) {
            value = jQuery.extend([], value);
            for (var i = 0, length = value.length; i < length; i++) {
                Sao.rpc.prepareObject(value[i], i, value);
            }
        } else if ((typeof(value) != 'string') &&
                (typeof(value) != 'number') &&
                (typeof(value) != 'boolean') &&
                (value !== null) &&
                (value !== undefined)) {
            if (value.isDate){
                value = {
                    '__class__': 'date',
                    'year': value.year(),
                    'month': value.month() + 1,
                    'day': value.date()
                };
            } else if (value.isDateTime) {
                value = value.clone();
                value = {
                    '__class__': 'datetime',
                    'year': value.utc().year(),
                    'month': value.utc().month() + 1,
                    'day': value.utc().date(),
                    'hour': value.utc().hour(),
                    'minute': value.utc().minute(),
                    'second': value.utc().second(),
                    'microsecond': value.utc().millisecond() * 1000
                };
            } else if (value.isTime) {
                value = {
                    '__class__': 'time',
                    'hour': value.hour(),
                    'minute': value.minute(),
                    'second': value.second(),
                    'microsecond': value.millisecond() * 1000
                };
            } else if (value.isTimeDelta) {
                value = {
                    '__class__': 'timedelta',
                    'seconds': value.asSeconds()
                };
            } else if (value instanceof Sao.Decimal) {
                value = {
                    '__class__': 'Decimal',
                    'decimal': value.toString()
                };
            } else if (value instanceof Uint8Array) {
                var strings = [], chunksize = 0xffff;
                // JavaScript Core has hard-coded argument limit of 65536
                // String.fromCharCode can not be called with too many
                // arguments
                for (var j = 0; j * chunksize < value.length; j++) {
                    strings.push(String.fromCharCode.apply(
                                null, value.subarray(
                                    j * chunksize, (j + 1) * chunksize)));
                }
                value = {
                    '__class__': 'bytes',
                    'base64': btoa(strings.join(''))
                };
            } else {
                value = jQuery.extend({}, value);
                for (var p in value) {
                    Sao.rpc.prepareObject(value[p], p, value);
                }
            }
        }
        if (parent) {
            parent[index] = value;
        }
        return parent || value;
    };

    jQuery.ajaxSetup({
        converters: {
           'text json': function(json) {
               return Sao.rpc.convertJSONObject(jQuery.parseJSON(json));
           }
        }
    });
}());

/* This file is part of Tryton.  The COPYRIGHT file at the top level of
   this repository contains the full copyright notices and license terms. */
(function() {
    'use strict';

    Sao.PYSON = {};

    Sao.PYSON.PYSON = Sao.class_(Object, {
        init: function() {
        },
        pyson: function() {
            throw 'NotImplementedError';
        },
        types: function() {
            throw 'NotImplementedError';
        }
    });

    Sao.PYSON.PYSON.eval_ = function(value, context) {
        throw 'NotImplementedError';
    };

    Sao.PYSON.Encoder = Sao.class_(Object, {
        encode: function(pyson) {
            return JSON.stringify(pyson, function(k, v) {
                if (v instanceof Sao.PYSON.PYSON) {
                    return v.pyson();
                } else if (v === null || v === undefined) {
                    return null;
                } else if (v._isAMomentObject) {
                    if (v.isDate) {
                        return Sao.PYSON.Date(
                            v.getFullYear(),
                            v.getMonth(),
                            v.getDate()).pyson();
                    } else {
                        return Sao.PYSON.DateTime(
                            v.getFullYear(),
                            v.getMonth(),
                            v.getDate(),
                            v.getHours(),
                            v.getMinutes(),
                            v.getSeconds(),
                            v.getMilliseconds()).pyson();
                    }
                }
                return v;
            });
        }
    });

    Sao.PYSON.Decoder = Sao.class_(Object, {
        init: function(context) {
            this.__context = context || {};
        },
        decode: function(str) {
            var reviver = function(k, v) {
                if (typeof v == 'object' && v !== null) {
                    var cls = Sao.PYSON[v.__class__];
                    if (cls) {
                        return cls.eval_(v, this.__context);
                    }
                }
                return v;
            };
            return JSON.parse(str, reviver.bind(this));
        }
    });

    Sao.PYSON.Eval = Sao.class_(Sao.PYSON.PYSON, {
        init: function(value, default_) {
            if (default_ === undefined) {
                default_ = '';
            }
            Sao.PYSON.Eval._super.init.call(this);
            this._value = value;
            this._default = default_;
        },
        pyson: function() {
            return {
                '__class__': 'Eval',
                'v': this._value,
                'd': this._default
            };
        },
        types: function() {
            if (this._default instanceof Sao.PYSON.PYSON) {
                return this._default.types();
            } else {
                return [typeof this._default];
            }
        }
    });

    Sao.PYSON.Eval.eval_ = function(value, context) {
        if (value.v in context) {
            return context[value.v];
        } else {
            return value.d;
        }
    };

    Sao.PYSON.Not = Sao.class_(Sao.PYSON.PYSON, {
        init: function(value) {
            Sao.PYSON.Not._super.init.call(this);
            if (value instanceof Sao.PYSON.PYSON) {
                if (jQuery(value.types()).not(['boolean']).length ||
                    jQuery(['boolean']).not(value.types()).length) {
                    throw 'value must be boolean';
                    }
            } else {
                if (typeof value != 'boolean') {
                    throw 'value must be boolean';
                }
            }
            this._value = value;
        },
        pyson: function() {
            return {
                '__class__': 'Not',
                'v': this._value
                };
        },
        types: function() {
            return ['boolean'];
        }
    });

    Sao.PYSON.Not.eval_ = function(value, context) {
        return !value.v;
    };

    Sao.PYSON.Bool = Sao.class_(Sao.PYSON.PYSON, {
        init: function(value) {
            Sao.PYSON.Bool._super.init.call(this);
            this._value = value;
        },
        pyson: function() {
            return {
                '__class__': 'Bool',
                'v': this._value
                };
        },
        types: function() {
            return ['boolean'];
        }
    });

    Sao.PYSON.Bool.eval_ = function(value, context) {
        if (value.v instanceof Object) {
            return !jQuery.isEmptyObject(value.v);
        } else {
            return Boolean(value.v);
        }
    };


    Sao.PYSON.And = Sao.class_(Sao.PYSON.PYSON, {
        init: function(statements) {
            if (statements === undefined) {
                statements = [];
            }
            Sao.PYSON.And._super.init.call(this);
            for (var i = 0, len = statements.length; i < len; i++) {
                var statement = statements[i];
                if (statement instanceof Sao.PYSON.PYSON) {
                    if (jQuery(statement.types()).not(['boolean']).length ||
                        jQuery(['boolean']).not(statement.types()).length) {
                        throw 'statement must be boolean';
                        }
                } else {
                    if (typeof statement != 'boolean') {
                        throw 'statement must be boolean';
                    }
                }
            }
            if (statements.length < 2) {
                throw 'must have at least 2 statements';
            }
            this._statements = statements;
        },
        pyson: function() {
            return {
                '__class__': 'And',
                's': this._statements
            };
        },
        types: function() {
            return ['boolean'];
        }
    });

    Sao.PYSON.And.eval_ = function(value, context) {
        var result = true;
        for (var i = 0, len = value.s.length; i < len; i++) {
            var statement = value.s[i];
            result = result && statement;
        }
        return result;
    };


    Sao.PYSON.Or = Sao.class_(Sao.PYSON.And, {
        pyson: function() {
            var result = Sao.PYSON.Or._super.pyson.call(this);
            result.__class__ = 'Or';
            return result;
        }
    });

    Sao.PYSON.Or.eval_ = function(value, context) {
        var result = false;
        for (var i = 0, len = value.s.length; i < len; i++) {
            var statement = value.s[i];
            result = result || statement;
        }
        return result;
    };

    Sao.PYSON.Equal = Sao.class_(Sao.PYSON.PYSON, {
        init: function(statement1, statement2) {
            Sao.PYSON.Equal._super.init.call(this);
            var types1, types2;
            if (statement1 instanceof Sao.PYSON.PYSON) {
                types1 = statement1.types();
            } else {
                types1 = [typeof statement1];
            }
            if (statement2 instanceof Sao.PYSON.PYSON) {
                types2 = statement2.types();
            } else {
                types2 = [typeof statement2];
            }
            if (jQuery(types1).not(types2).length ||
                jQuery(types2).not(types1).length) {
                throw 'statements must have the same type';
                }
            this._statement1 = statement1;
            this._statement2 = statement2;
        },
        pyson: function() {
            return {
                '__class__': 'Equal',
                's1': this._statement1,
                's2': this._statement2
            };
        },
        types: function() {
            return ['boolean'];
        }
    });

    Sao.PYSON.Equal.eval_ = function(value, context) {
        if (value.s1 instanceof Array  && value.s2 instanceof Array) {
            return Sao.common.compare(value.s1, value.s2);
        } else {
            return value.s1 == value.s2;
        }
    };

    Sao.PYSON.Greater = Sao.class_(Sao.PYSON.PYSON, {
        init: function(statement1, statement2, equal) {
            Sao.PYSON.Greater._super.init.call(this);
            var statements = [statement1, statement2];
            for (var i = 0; i < 2; i++) {
                var statement = statements[i];
                if (statement instanceof Sao.PYSON.PYSON) {
                    if (jQuery(statement).not(['number']).length) {
                        throw 'statement must be an integer or a float';
                    }
                } else {
                    if (typeof statement != 'number') {
                        throw 'statement must be an integer or a float';
                    }
                }
            }
            if (equal === undefined) {
                equal = false;
            }
            if (equal instanceof Sao.PYSON.PYSON) {
                if (jQuery(equal.types()).not(['boolean']).length ||
                    jQuery(['boolean']).not(equal.types()).length) {
                    throw 'equal must be boolean';
                    }
            } else {
                if (typeof equal != 'boolean') {
                    throw 'equal must be boolean';
                }
            }
            this._statement1 = statement1;
            this._statement2 = statement2;
            this._equal = equal;
        },
        pyson: function() {
            return {
                '__class__': 'Greater',
                's1': this._statement1,
                's2': this._statement2,
                'e': this._equal
            };
        },
        types: function() {
            return ['boolean'];
        }
    });

    Sao.PYSON.Greater._convert = function(value) {
        value = jQuery.extend({}, value);
        value.s1 = Number(value.s1);
        value.s2 = Number(value.s2);
        return value;
    };

    Sao.PYSON.Greater.eval_ = function(value, context) {
        value = Sao.PYSON.Greater._convert(value);
        if (value.e) {
            return value.s1 >= value.s2;
        } else {
            return value.s1 > value.s2;
        }
    };

    Sao.PYSON.Less = Sao.class_(Sao.PYSON.Greater, {
        pyson: function() {
            var result = Sao.PYSON.Less._super.pyson.call(this);
            result.__class__ = 'Less';
            return result;
        }
    });

    Sao.PYSON.Less._convert = Sao.PYSON.Greater._convert;

    Sao.PYSON.Less.eval_ = function(value, context) {
        value = Sao.PYSON.Less._convert(value);
        if (value.e) {
            return value.s1 <= value.s2;
        } else {
            return value.s1 < value.s2;
        }
    };

    Sao.PYSON.If = Sao.class_(Sao.PYSON.PYSON, {
        init: function(condition, then_statement, else_statement) {
            Sao.PYSON.If._super.init.call(this);
            if (condition instanceof Sao.PYSON.PYSON) {
                if (jQuery(condition.types()).not(['boolean']).length ||
                    jQuery(['boolean']).not(condition.types()).length) {
                    throw 'condition must be boolean';
                }
            } else {
                if (typeof condition != 'boolean') {
                    throw 'condition must be boolean';
                }
            }
            var then_types, else_types;
            if (then_statement instanceof Sao.PYSON.PYSON) {
                then_types = then_statement.types();
            } else {
                then_types = [typeof then_statement];
            }
            if (else_statement === undefined) {
                else_statement = null;
            }
            if (else_statement instanceof Sao.PYSON.PYSON) {
                else_types = else_statement.types();
            } else {
                else_types = [typeof else_statement];
            }
            if (jQuery(then_types).not(else_types).length ||
                jQuery(else_types).not(then_types).length) {
                throw 'then and else statements must be the same type';
            }
            this._condition = condition;
            this._then_statement = then_statement;
            this._else_statement = else_statement;
        },
        pyson: function() {
            return {
                '__class__': 'If',
                'c': this._condition,
                't': this._then_statement,
                'e': this._else_statement
            };
        },
        types: function() {
            if (this._then_statement instanceof Sao.PYSON.PYSON) {
                return this._then_statement.types();
            } else {
                return [typeof this._then_statement];
            }
        }
    });

    Sao.PYSON.If.eval_ = function(value, context) {
        if (value.c) {
            return value.t;
        } else {
            return value.e;
        }
    };

    Sao.PYSON.Get = Sao.class_(Sao.PYSON.PYSON, {
        init: function(obj, key, default_) {
            Sao.PYSON.Get._super.init.call(this);
            if (default_ === undefined) {
                default_ = null;
            }
            if (obj instanceof Sao.PYSON.PYSON) {
                if (jQuery(obj.types()).not(['object']).length ||
                    jQuery(['object']).not(obj.types()).length) {
                    throw 'obj must be a dict';
                }
            } else {
                if (!(obj instanceof Object)) {
                    throw 'obj must be a dict';
                }
            }
            this._obj = obj;
            if (key instanceof Sao.PYSON.PYSON) {
                if (jQuery(key.types()).not(['string']).length ||
                    jQuery(['string']).not(key.types()).length) {
                    throw 'key must be a string';
                }
            } else {
                if (typeof key != 'string') {
                    throw 'key must be a string';
                }
            }
            this._key = key;
            this._default = default_;
        },
        pyson: function() {
            return {
                '__class__': 'Get',
                'v': this._obj,
                'k': this._key,
                'd': this._default
            };
        },
        types: function() {
            if (this._default instanceof Sao.PYSON.PYSON) {
                return this._default.types();
            } else {
                return [typeof this._default];
            }
        }
    });

    Sao.PYSON.Get.eval_ = function(value, context) {
        if (value.k in value.v) {
            return value.v[value.k];
        } else {
            return value.d;
        }
    };

    Sao.PYSON.In = Sao.class_(Sao.PYSON.PYSON, {
        init: function(key, obj) {
            Sao.PYSON.In._super.init.call(this);
            if (key instanceof Sao.PYSON.PYSON) {
                if (jQuery(key.types()).not(['string', 'number']).length) {
                    throw 'key must be a string or a number';
                }
            } else {
                if (!~['string', 'number'].indexOf(typeof key)) {
                    throw 'key must be a string or a number';
                }
            }
            if (obj instanceof Sao.PYSON.PYSON) {
                if (jQuery(obj.types()).not(['object']).length ||
                    jQuery(['object']).not(obj.types()).length) {
                    throw 'obj must be a dict or a list';
                }
            } else {
                if (!(obj instanceof Object)) {
                    throw 'obj must be a dict or a list';
                }
            }
            this._key = key;
            this._obj = obj;
        },
        pyson: function() {
            return {'__class__': 'In',
                'k': this._key,
                'v': this._obj
            };
        },
        types: function() {
            return ['boolean'];
        }
    });

    Sao.PYSON.In.eval_ = function(value, context) {
        if (value.v.indexOf) {
            return Boolean(~value.v.indexOf(value.k));
        } else {
            return !!value.v[value.k];
        }
    };

    Sao.PYSON.Date = Sao.class_(Sao.PYSON.PYSON, {
        init: function(year, month, day, delta_years, delta_months, delta_days)
        {
            Sao.PYSON.Date._super.init.call(this);
            if (year === undefined) year = null;
            if (month === undefined) month = null;
            if (day === undefined) day = null;
            if (delta_years === undefined) delta_years = 0;
            if (delta_months === undefined) delta_months = 0;
            if (delta_days === undefined) delta_days = 0;

            this._test(year, 'year');
            this._test(month, 'month');
            this._test(day, 'day');
            this._test(delta_years, 'delta_years');
            this._test(delta_days, 'delta_days');
            this._test(delta_months, 'delta_months');

            this._year = year;
            this._month = month;
            this._day = day;
            this._delta_years = delta_years;
            this._delta_months = delta_months;
            this._delta_days = delta_days;
        },
        pyson: function() {
            return {
                '__class__': 'Date',
                'y': this._year,
                'M': this._month,
                'd': this._day,
                'dy': this._delta_years,
                'dM': this._delta_months,
                'dd': this._delta_days
            };
        },
        types: function() {
            return ['object'];
        },
        _test: function(value, name) {
            if (value instanceof Sao.PYSON.PYSON) {
                if (jQuery(value.types()).not(
                        ['number', typeof null]).length) {
                    throw name + ' must be an integer or None';
                }
            } else {
                if ((typeof value != 'number') && (value !== null)) {
                    throw name + ' must be an integer or None';
                }
            }
        }
    });

    Sao.PYSON.Date.eval_ = function(value, context) {
        var date = Sao.Date(value.y, value.M && value.M - 1, value.d);
        if (value.dy) date.add(value.dy, 'y');
        if (value.dM) date.add(value.dM, 'M');
        if (value.dd) date.add(value.dd, 'd');
        return date;
    };

    Sao.PYSON.DateTime = Sao.class_(Sao.PYSON.Date, {
        init: function(year, month, day, hour, minute, second, microsecond,
                  delta_years, delta_months, delta_days, delta_hours,
                  delta_minutes, delta_seconds, delta_microseconds) {
            Sao.PYSON.DateTime._super.init.call(this, year, month, day,
                delta_years, delta_months, delta_days);
            if (hour === undefined) hour = null;
            if (minute === undefined) minute = null;
            if (second === undefined) second = null;
            if (microsecond === undefined) microsecond = null;
            if (delta_hours === undefined) delta_hours = 0;
            if (delta_minutes === undefined) delta_minutes = 0;
            if (delta_seconds === undefined) delta_seconds = 0;
            if (delta_microseconds === undefined) delta_microseconds = 0;

            this._test(hour, 'hour');
            this._test(minute, 'minute');
            this._test(second, 'second');
            this._test(microsecond, 'microsecond');
            this._test(delta_hours, 'delta_hours');
            this._test(delta_minutes, 'delta_minutes');
            this._test(delta_seconds, 'delta_seconds');
            this._test(delta_microseconds, 'delta_microseconds');

            this._hour = hour;
            this._minute = minute;
            this._second = second;
            this._microsecond = microsecond;
            this._delta_hours = delta_hours;
            this._delta_minutes = delta_minutes;
            this._delta_seconds = delta_seconds;
            this._delta_microseconds = delta_microseconds;
        },
        pyson: function() {
            var result = Sao.PYSON.DateTime._super.pyson.call(this);
            result.__class__ = 'DateTime';
            result.h = this._hour;
            result.m = this._minute;
            result.s = this._second;
            result.ms = this._microsecond;
            result.dh = this._delta_hours;
            result.dm = this._delta_minutes;
            result.ds = this._delta_seconds;
            result.dms = this._delta_microseconds;
            return result;
        }
    });

    Sao.PYSON.DateTime.eval_ = function(value, context) {
        var date = Sao.DateTime(value.y, value.M && value.M - 1, value.d,
                value.h, value.m, value.s, value.ms && value.ms / 1000);
        if (value.dy) date.add(value.dy, 'y');
        if (value.dM) date.add(value.dM, 'M');
        if (value.dd) date.add(value.dd, 'd');
        if (value.dh) date.add(value.dh, 'h');
        if (value.dm) date.add(value.dm, 'm');
        if (value.ds) date.add(value.ds, 's');
        if (value.dms) date.add(value.dms / 1000, 'ms');
        return date;
    };

    Sao.PYSON.Len = Sao.class_(Sao.PYSON.PYSON, {
        init: function(value) {
            Sao.PYSON.Len._super.init.call(this);
            if (value instanceof Sao.PYSON.PYSON) {
                if (jQuery(value.types()).not(['object', 'string']).length ||
                    jQuery(['object', 'string']).not(value.types()).length) {
                    throw 'value must be an object or a string';
                }
            } else {
                if ((typeof value != 'object') && (typeof value != 'string')) {
                    throw 'value must be an object or a string';
                }
            }
            this._value = value;
        },
        pyson: function() {
            return {
                '__class__': 'Len',
                'v': this._value
            };
        },
        types: function() {
            return ['integer'];
        }
    });

    Sao.PYSON.Len.eval_ = function(value, context) {
        if (typeof value.v == 'object') {
            return Object.keys(value.v).length;
        } else {
            return value.v.length;
        }
    };
}());

/* This file is part of Tryton.  The COPYRIGHT file at the top level of
   this repository contains the full copyright notices and license terms. */
(function() {
    'use strict';

    Sao.Session = Sao.class_(Object, {
        init: function(database, login) {
            this.user_id = null;
            this.session = null;
            this.prm = jQuery.when();  // renew promise
            this.database = database;
            this.login = login;
            this.context = {};
            if (!Sao.Session.current_session) {
                Sao.Session.current_session = this;
            }
        },
        get_auth: function() {
            return btoa(this.login + ':' + this.user_id + ':' + this.session);
        },
        do_login: function(login, password) {
            var dfd = jQuery.Deferred();
            var timeoutID = Sao.common.processing.show();
            var args = {
                'method': 'common.db.login',
                'params': [login, password]
            };
            var ajax_prm = jQuery.ajax({
                'contentType': 'application/json',
                'data': JSON.stringify(args),
                'dataType': 'json',
                'url': '/' + this.database + '/',
                'type': 'post',
                'complete': [function() {
                    Sao.common.processing.hide(timeoutID);
                }]
            });

            var ajax_success = function(data) {
                if (data === null) {
                    Sao.common.warning.run('',
                           Sao.i18n.gettext('Unable to reach the server.'));
                    dfd.reject();
                } else if (data.error) {
                    Sao.common.error.run(data.error[0], data.error[1]);
                    dfd.reject();
                } else {
                    if (!data.result) {
                        this.user_id = null;
                        this.session = null;
                        dfd.reject();
                    } else {
                        this.user_id = data.result[0];
                        this.session = data.result[1];
                        dfd.resolve();
                    }
                }
            };
            ajax_prm.success(ajax_success.bind(this));
            ajax_prm.error(dfd.reject);
            return dfd.promise();
        },
        do_logout: function() {
            if (!(this.user_id && this.session)) {
                return jQuery.when();
            }
            var args = {
                'method': 'common.db.logout',
                'params': []
            };
            var prm = jQuery.ajax({
                'headers': {
                    'Authorization': 'Session ' + this.get_auth()
                },
                'contentType': 'application/json',
                'data': JSON.stringify(args),
                'dataType': 'json',
                'url': '/' + this.database + '/',
                'type': 'post',
            });
            this.database = null;
            this.login = null;
            this.user_id = null;
            this.session = null;
            if (Sao.Session.current_session === this) {
                Sao.Session.current_session = null;
            }
            return prm;
        },
        reload_context: function() {
            var args = {
                'method': 'model.res.user.get_preferences',
                'params': [true, {}]
            };
            // Call with custom session to not send context
            var session = jQuery.extend({}, this);
            session.context = {};
            var prm = Sao.rpc(args, session);
            return prm.then(function(context) {
                this.context = context;
            }.bind(this));
        }
    });

    Sao.Session.login_dialog = function() {
        var dialog = new Sao.Dialog(Sao.i18n.gettext('Login'), 'lg');
        dialog.database_select = jQuery('<select/>', {
            'class': 'form-control',
            'id': 'login-database'
        }).hide();
        dialog.database_input = jQuery('<input/>', {
            'class': 'form-control',
            'id': 'login-database'
        }).hide();
        dialog.login_input = jQuery('<input/>', {
            'class': 'form-control',
            'id': 'login-login',
            'placeholder': Sao.i18n.gettext('Login')
        });
        dialog.password_input = jQuery('<input/>', {
            'class': 'form-control',
            'type': 'password',
            'id': 'login-password',
            'placeholder': Sao.i18n.gettext('Password')
        });
        dialog.body.append(jQuery('<div/>', {
            'class': 'form-group'
        }).append(jQuery('<label/>', {
            'class': 'control-label',
            'for': 'login-database'
        }).append(Sao.i18n.gettext('Database')))
        .append(dialog.database_select)
        .append(dialog.database_input)
        ).append(jQuery('<div/>', {
            'class': 'form-group'
        }).append(jQuery('<label/>', {
            'class': 'control-label',
            'for': 'login-login'
        }).append(Sao.i18n.gettext('Login')))
        .append(dialog.login_input)
        ).append(jQuery('<div/>', {
            'class': 'form-group'
        }).append(jQuery('<label/>', {
            'class': 'control-label',
            'for': 'login-password'
        }).append(Sao.i18n.gettext('Password')))
        .append(dialog.password_input));
        dialog.button = jQuery('<button/>', {
            'class': 'btn btn-primary',
            'type': 'submit'
        }).append(Sao.i18n.gettext('Login')).appendTo(dialog.footer);
        return dialog;
    };

    Sao.Session.get_credentials = function() {
        var dfd = jQuery.Deferred();
        var database = window.location.hash.replace(
                /^(#(!|))/, '') || null;
        var dialog = Sao.Session.login_dialog();

        var empty_field = function() {
            return dialog.modal.find('input,select').filter(':visible')
                .filter(function() {
                    return !jQuery(this).val();
                });
        };

        var ok_func = function() {
            var login = dialog.login_input.val();
            var password = dialog.password_input.val();
            var database = database || dialog.database_select.val() ||
                dialog.database_input.val();
            dialog.modal.find('.has-error').removeClass('has-error');
            if (!(login && password && database)) {
                empty_field().closest('.form-group').addClass('has-error');
                return;
            }
            dialog.button.focus();
            dialog.button.prop('disabled', true);
            var session = new Sao.Session(database, login);
            session.do_login(login, password)
                .then(function() {
                    dfd.resolve(session);
                    dialog.modal.remove();
                }, function() {
                    dialog.button.prop('disabled', false);
                    dialog.password_input.val('');
                    empty_field().closest('.form-group').addClass('has-error');
                    empty_field().first().focus();
                });
        };

        dialog.modal.modal({
            backdrop: false,
            keyboard: false
        });
        dialog.modal.find('form').unbind().submit(function(e) {
            ok_func();
            e.preventDefault();
        });

        jQuery.when(Sao.DB.list()).then(function(databases) {
            var el;
            if (jQuery.isEmptyObject(databases)) {
                el = dialog.database_input;
            } else {
                el = dialog.database_select;
                databases.forEach(function(database) {
                    el.append(jQuery('<option/>', {
                        'value': database,
                        'text': database
                    }));
                });
            }
            el.show();
            el.val(database || '');
            empty_field().first().focus();
        });
        return dfd.promise();
    };

    Sao.Session.password_dialog = function() {
        var dialog = new Sao.Dialog(Sao.i18n.gettext('Password'), 'lg');
        dialog.password_input = jQuery('<input/>', {
            'class': 'form-control',
            'type': 'password',
            'id': 'password-password',
            'placeholder': Sao.i18n.gettext('Password')
        });
        dialog.body.append(jQuery('<div/>', {
            'class': 'form-group'
        }).append(jQuery('<label/>', {
            'for': 'password-password'
        }).append(Sao.i18n.gettext('Password')))
        .append(dialog.password_input));
        dialog.button = jQuery('<button/>', {
            'class': 'btn btn-primary',
            'type': 'submit'
        }).append(Sao.i18n.gettext('OK')).appendTo(dialog.footer);
        return dialog;
    };

    Sao.Session.renew = function(session) {
        if (session.prm.state() == 'pending') {
            return session.prm;
        }
        var dfd = jQuery.Deferred();
        session.prm = dfd.promise();
        var dialog = Sao.Session.password_dialog();
        if (!session.login) {
            dfd.reject();
            return session.prm;
        }

        var ok_func = function() {
            var password = dialog.password_input.val();
            dialog.button.focus();
            dialog.button.prop('disabled', true);
            session.do_login(session.login, password)
                .then(function() {
                    dfd.resolve();
                    dialog.modal.remove();
                }, function() {
                    dialog.button.prop('disabled', false);
                    dialog.password_input.val('').focus();
                });
        };

        dialog.modal.modal({
            backdrop: false,
            keyboard: false
        });
        dialog.modal.on('shown.bs.modal', function() {
            dialog.password_input.focus();
        });
        dialog.modal.find('form').unbind().submit(function(e) {
            ok_func();
            e.preventDefault();
        });
        dialog.modal.modal('show');
        return session.prm;
    };

    Sao.Session.current_session = null;

    Sao.DB = {};

    Sao.DB.list = function() {
        var timeoutID = Sao.common.processing.show();
        return jQuery.ajax({
            'contentType': 'application/json',
            'data': JSON.stringify({
                'method': 'common.db.list',
                'params': []
            }),
            'dataType': 'json',
            'url': '/',
            'type': 'post',
            'complete': [function() {
                Sao.common.processing.hide(timeoutID);
            }]
        }).then(function(data) {
            return data.result;
        });
    };
}());

/* This file is part of Tryton.  The COPYRIGHT file at the top level of
   this repository contains the full copyright notices and license terms. */
(function() {
    'use strict';

    Sao.Model = Sao.class_(Object, {
        init: function(name, attributes) {
            attributes = attributes || {};
            this.name = name;
            this.session = Sao.Session.current_session;
            this.fields = {};
        },
        add_fields: function(descriptions) {
            for (var name in descriptions) {
                if (descriptions.hasOwnProperty(name) &&
                    (!(name in this.fields))) {
                        var desc = descriptions[name];
                        var Field = Sao.field.get(desc.type);
                        this.fields[name] = new Field(desc);
                    }
            }
        },
        execute: function(method, params, context) {
            if (context === undefined) {
                context = {};
            }
            var args = {
                'method': 'model.' + this.name + '.' + method,
                'params': params.concat(context)
            };
            return Sao.rpc(args, this.session);
        },
        find: function(condition, offset, limit, order, context) {
            if (!offset) offset = 0;
            var self = this;
            var prm = this.execute('search',
                    [condition, offset, limit, order], context);
            var instanciate = function(ids) {
                return Sao.Group(self, context, ids.map(function(id) {
                    return new Sao.Record(self, id);
                }));
            };
            return prm.pipe(instanciate);
        },
        delete_: function(records) {
            if (jQuery.isEmptyObject(records)) {
                return jQuery.when();
            }
            var record = records[0];
            var root_group = record.group.root_group();
            console.assert(records.every(function(r) {
                return r.model.name == record.model.name;
            }), 'records not from the same model');
            console.assert(records.every(function(r) {
                return r.group.root_group() == record.group.root_group();
            }), 'records not from the same root group');
            records = records.filter(function(record) {
                return record.id >= 0;
            });
            var context = {};
            context._timestamp = {};
            records.forEach(function(record) {
                jQuery.extend(context._timestamp, record.get_timestamp());
            });
            var record_ids = records.map(function(record) {
                return record.id;
            });
            return root_group.on_write_ids(record_ids).then(function(reload_ids) {
                reload_ids = reload_ids.filter(function(e) {
                    return !~record_ids.indexOf(e);
                });
                return this.execute('delete', [record_ids], context)
                .then(function() {
                    root_group.reload(reload_ids);
                });
            }.bind(this));
        },
        copy: function(records, context) {
            if (jQuery.isEmptyObject(records)) {
                return jQuery.when();
            }
            var record_ids = records.map(function(record) {
                return record.id;
            });
            return this.execute('copy', [record_ids, {}], context);
        }
    });

    Sao.Group = function(model, context, array) {
        array.prm = jQuery.when();
        array.model = model;
        array._context = context;
        array.on_write = [];
        array.parent = undefined;
        array.screens = [];
        array.parent_name = '';
        array.children = [];
        array.child_name = '';
        array.parent_datetime_field = undefined;
        array.record_removed = [];
        array.record_deleted = [];
        array.__readonly = false;
        array.skip_model_access = false;
        array.forEach(function(e, i, a) {
            e.group = a;
        });
        array.get_readonly = function() {
            // Must skip res.user for Preference windows
            var access = Sao.common.MODELACCESS.get(this.model.name);
            if (this.context._datetime ||
                    (!(access.write || access.create) &&
                     !this.skip_model_access)) {
                return true;
            }
            return this.__readonly;
        };
        array.set_readonly = function(value) {
            this.__readonly = value;
        };
        array.load = function(ids, modified) {
            var new_records = [];
            var i, len;
            for (i = 0, len = ids.length; i < len; i++) {
                var id = ids[i];
                var new_record = this.get(id);
                if (!new_record) {
                    new_record = new Sao.Record(this.model, id);
                    new_record.group = this;
                    this.push(new_record);
                }
                new_records.push(new_record);
            }
            // Remove previously removed or deleted records
            var record_removed = [];
            var record;
            for (i = 0, len = this.record_removed.length; i < len; i++) {
                record = this.record_removed[i];
                if (!~ids.indexOf(record.id)) {
                    record_removed.push(record);
                }
            }
            this.record_removed = record_removed;
            var record_deleted = [];
            for (i = 0, len = this.record_deleted.length; i < len; i++) {
                record = this.record_deleted[i];
                if (!~ids.indexOf(record.id)) {
                    record_deleted.push(record);
                }
            }
            this.record_deleted = record_deleted;
            if (new_records.length && modified) {
                this.changed();
            }
        };
        array.get = function(id) {
            // TODO optimize
            for (var i = 0, len = this.length; i < len; i++) {
                var record = this[i];
                if (record.id == id) {
                    return record;
                }
            }
        };
        array.new_ = function(default_, id) {
            var record = new Sao.Record(this.model, id);
            record.group = this;
            if (default_) {
                record.default_get();
            }
            return record;
        };
        array.add = function(record, position, changed) {
            if ((position === undefined) || (position == -1)) {
                position = this.length;
            }
            if (changed === undefined) {
                changed = true;
            }
            if (record.group != this) {
                record.group = this;
            }
            this.splice(position, 0, record);
            for (var record_rm in this.record_removed) {
                if (record_rm.id == record.id) {
                    this.record_removed.splice(
                            this.record_removed.indexOf(record_rm), 1);
                }
            }
            for (var record_del in this.record_deleted) {
                if (record_del.id == record.id) {
                    this.record_deleted.splice(
                            this.record_deleted.indexOf(record_del), 1);
                }
            }
            record._changed.id = true;
            if (changed) {
                this.changed();
                // Set parent field to trigger on_change
                if (this.parent && this.model.fields[this.parent_name]) {
                    var field = this.model.fields[this.parent_name];
                    if ((field instanceof Sao.field.Many2One) ||
                            field instanceof Sao.field.Reference) {
                        var value = [this.parent.id, ''];
                        if (field instanceof Sao.field.Reference) {
                            value = [this.parent.model.name, value];
                        }
                        field.set_client(record, value);
                    }
                }
            }
            return record;
        };
        // [Bug Sao]
        // TODO: report to tryton
        //      limit calls to changed()
        array.remove = function(record, remove, modified, force_remove, apply_changes) {
            if (modified === undefined) {
                modified = true;
            }

            if (apply_changes === undefined) {
                apply_changes = true;
            }

            var idx = this.indexOf(record);
            if (record.id >= 0) {
                if (remove) {
                    if (~this.record_deleted.indexOf(record)) {
                        this.record_deleted.splice(
                                this.record_deleted.indexOf(record), 1);
                    }
                    this.record_removed.push(record);
                } else {
                    if (~this.record_removed.indexOf(record)) {
                        this.record_removed.splice(
                                this.record_removed.indexOf(record), 1);
                    }
                    this.record_deleted.push(record);
                }
            }
            if (record.group.parent) {
                record.group.parent._changed.id = true;
            }
            if (modified) {
                record._changed.id = true;
            }
            if (!(record.group.parent) || (record.id < 0) || force_remove) {
                this._remove(record);
            }
            if (apply_changes){
                record.group.changed();
                record.group.root_group().screens.forEach(function(screen) {
                    screen.display();
                });
            }
        };
        array._remove = function(record) {
            var idx = this.indexOf(record);
            this.splice(idx, 1);
        };
        array.unremove = function(record) {
            this.record_removed.splice(this.record_removed.indexOf(record), 1);
            this.record_deleted.splice(this.record_deleted.indexOf(record), 1);
            record.group.changed();
            record.group.root_group().screens.forEach(function(screen) {
                screen.display();
            });
        };
        array.changed = function() {
            if (!this.parent) {
                return jQuery.when();
            }
            this.parent._changed[this.child_name] = true;
            var prm = jQuery.Deferred();
            var changed_prm = this.parent.model.fields[this.child_name]
                .changed(this.parent);
            // One2Many.changed could return undefined
            if (changed_prm) {
                changed_prm.then(function() {
                    this.parent.validate(null, true).done(function() {
                        this.parent.group.changed().done(prm.resolve);
                    }.bind(this));
                }.bind(this));
            } else {
                prm.resolve();
            }
            return prm;
        };
        array.root_group = function() {
            var root = this;
            var parent = this.parent;
            while (parent) {
                root = parent.group;
                parent = parent.parent;
            }
            return root;
        };
        array.save = function() {
            var deferreds = [];
            this.forEach(function(record) {
                deferreds.push(record.save());
            });
            if (!jQuery.isEmptyObject(this.record_deleted)) {
                deferreds.push(this.model.delete_(this.record_deleted));
            }
            return jQuery.when.apply(jQuery, deferreds);
        };
        array.written = function(ids) {
            if (typeof(ids) == 'number') {
                ids = [ids];
            }
            return this.on_write_ids(ids).then(function(to_reload) {
                to_reload = to_reload.filter(function(e) {
                    return !~ids.indexOf(e);
                });
                this.root_group().reload(to_reload);
            }.bind(this));
        };
        array.reload = function(ids) {
            this.children.forEach(function(child) {
                child.reload(ids);
            });
            ids.forEach(function(id) {
                var record = this.get(id);
                if (record && jQuery.isEmptyObject(record._changed)) {
                    record.cancel();
                }
            }.bind(this));
        };
        array.on_write_ids = function(ids) {
            var deferreds = [];
            var result = [];
            this.on_write.forEach(function(fnct) {
                var prm = this.model.execute(fnct, [ids], this._context)
                .then(function(res) {
                    jQuery.extend(result, res);
                });
                deferreds.push(prm);
            }.bind(this));
            return jQuery.when.apply(jQuery, deferreds).then(function() {
                return result.filter(function(e, i, a) {
                    return i == a.indexOf(e);
                });
            });
        };
        array.set_parent = function(parent) {
            this.parent = parent;
            if (parent && parent.model.name == this.model.name) {
                this.parent.group.children.push(this);
            }
        };
        array.destroy = function() {
            if (this.parent) {
                var i = this.parent.group.children.indexOf(this);
                if (~i) {
                    this.parent.group.children.splice(i, 1);
                }
            }
            this.parent = null;
        };
        array.domain = function() {
            var domain = [];
            this.screens.forEach(function(screen) {
                if (screen.attributes.domain) {
                    domain.push(screen.attributes.domain);
                }
            });
            if (this.parent && this.child_name) {
                var field = this.parent.model.fields[this.child_name];
                return [domain, field.get_domain(this.parent)];
            } else {
                return domain;
            }
        };
        array.context = function() {
            var context = jQuery.extend({}, this._context);
            if (this.parent) {
                jQuery.extend(context, this.parent.get_context());
                if (this.child_name in this.parent.model.fields) {
                    var field = this.parent.model.fields[this.child_name];
                    jQuery.extend(context, field.get_context(this.parent));
                }
            }
            jQuery.extend(context, this._context);
            if (this.parent_datetime_field) {
                context._datetime = this.parent.get_eval()
                    [this.parent_datetime_field];
            }
            return context;
        };
        array.set_context = function(context) {
            this._context = jQuery.extend({}, context);
        };
        array.clean4inversion = function(domain) {
            if (jQuery.isEmptyObject(domain)) {
                return [];
            }
            var inversion = new Sao.common.DomainInversion();
            var head = domain[0];
            var tail = domain.slice(1);
            if (~['AND', 'OR'].indexOf(head)) {
            } else if (inversion.is_leaf(head)) {
                var field = head[0];
                if ((field in this.model.fields) &&
                        (this.model.fields[field].description.readonly)) {
                    head = [];
                }
            } else {
                head = this.clean4inversion(head);
            }
            return [head].concat(this.clean4inversion(tail));
        };
        array.domain4inversion = function() {
            var domain = this.domain();
            if (!this.__domain4inversion ||
                    !Sao.common.compare(this.__domain4inversion[0], domain)) {
                this.__domain4inversion = [domain, this.clean4inversion(domain)];
            }
            return this.__domain4inversion[1];
        };
        array.get_by_path = function(path) {
            path = jQuery.extend([], path);
            var record = null;
            var group = this;

            var browse_child = function() {
                if (jQuery.isEmptyObject(path)) {
                    return record;
                }
                var child_name = path[0][0];
                var id = path[0][1];
                path.splice(0, 1);
                record = group.get(id);
                if (!record) {
                    return null;
                }
                if (!child_name) {
                    return browse_child();
                }
                return record.load(child_name).then(function() {
                    group = record._values[child_name];
                    if (!group) {
                        return null;
                    }
                    return browse_child();
                });
            };
            return jQuery.when().then(browse_child);
        };
        return array;
    };

    Sao.Record = Sao.class_(Object, {
        id_counter: -1,
        init: function(model, id) {
            this.model = model;
            this.group = Sao.Group(model, {}, []);
            this.id = id || Sao.Record.prototype.id_counter--;
            this._values = {};
            this._changed = {};
            this._loaded = {};
            this.fields = {};
            this._timestamp = null;
            this.attachment_count = -1;
            this.unread_note = -1;
            this.state_attrs = {};
            this.autocompletion = {};
            this.exception = false;
        },
        has_changed: function() {
            return !jQuery.isEmptyObject(this._changed);
        },
        save: function(force_reload) {
            if (force_reload === undefined) {
                force_reload = false;
            }
            var context = this.get_context();
            var prm = jQuery.when();
            var values = this.get();
            if ((this.id < 0) || !jQuery.isEmptyObject(values)) {
                if (this.id < 0) {
                    prm = this.model.execute('create', [[values]], context);
                    var created = function(ids) {
                        this.id = ids[0];
                    };
                    prm.done(created.bind(this));
                } else {
                    if (!jQuery.isEmptyObject(values)) {
                        context._timestamp = this.get_timestamp();
                        prm = this.model.execute('write', [[this.id], values],
                            context);
                    }
                }
                prm = prm.done(function() {
                    this.cancel();
                    if (force_reload) {
                        return this.reload();
                    }
                }.bind(this));
                if (this.group) {
                    prm = prm.done(function() {
                        return this.group.written(this.id);
                    }.bind(this));
                }
            }
            if (this.group.parent) {
                delete this.group.parent._changed[this.group.child_name];
                prm = prm.done(function() {
                    return this.group.parent.save(force_reload);
                }.bind(this));
            }
            return prm;
        },
        reload: function(fields) {
            if (this.id < 0) {
                return jQuery.when();
            }
            if (!fields) {
                return this.load('*');
            } else {
                var prms = fields.map(function(field) {
                    return this.load(field);
                }.bind(this));
                return jQuery.when.apply(jQuery, prms);
            }
        },
        load: function(name) {
            var fname;
            var prm;
            if ((this.id < 0) || (name in this._loaded)) {
                return jQuery.when();
            }
            if (this.group.prm.state() == 'pending') {
                prm = jQuery.Deferred();
                this.group.prm.then(function() {
                    this.load(name).then(prm.resolve, prm.reject);
                }.bind(this));
                return prm;
            }
            var id2record = {};
            id2record[this.id] = this;
            var loading;
            if (name == '*') {
                loading = 'eager';
                for (fname in this.model.fields) {
                    if (!this.model.fields.hasOwnProperty(fname)) {
                        continue;
                    }
                    var field_loading = (
                            this.model.fields[fname].description.loading ||
                            'eager');
                    if (field_loading != 'eager') {
                        loading = 'lazy';
                        break;
                    }
                }
            } else {
                loading = (this.model.fields[name].description.loading ||
                        'eager');
            }
            var fnames = [];
            if (loading == 'eager') {
                for (fname in this.model.fields) {
                    if (!this.model.fields.hasOwnProperty(fname)) {
                        continue;
                    }
                    if ((this.model.fields[fname].description.loading ||
                                'eager') == 'eager') {
                        fnames.push(fname);
                    }
                }
            } else {
                fnames = Object.keys(this.model.fields);
            }
            fnames = fnames.filter(function(e, i, a) {
                return !(e in this._loaded);
            }.bind(this));
            var fnames_to_fetch = fnames.slice();
            var rec_named_fields = ['many2one', 'one2one', 'reference'];
            for (var i in fnames) {
                fname = fnames[i];
                var fdescription = this.model.fields[fname].description;
                if (~rec_named_fields.indexOf(fdescription.type))
                    fnames_to_fetch.push(fname + '.rec_name');
            }
            if (!~fnames.indexOf('rec_name')) {
                fnames_to_fetch.push('rec_name');
            }
            fnames_to_fetch.push('_timestamp');

            var context = jQuery.extend({}, this.get_context());
            if (loading == 'eager') {
                var limit = parseInt(Sao.config.limit / fnames_to_fetch.length,
                        10);

                var filter_group = function(record) {
                    return !(name in record._loaded) && (record.id >= 0);
                };
                var filter_parent_group = function(record) {
                    return (filter_group(record) &&
                            (id2record[record.id] === undefined) &&
                            ((record.group === this.group) ||
                             // Don't compute context for same group
                             (JSON.stringify(record.get_context()) ===
                              JSON.stringify(context))));
                }.bind(this);
                var group, filter;
                if (this.group.parent &&
                        (this.group.parent.model.name == this.model.name)) {
                    group = [];
                    group = group.concat.apply(
                            group, this.group.parent.group.children);
                    filter = filter_parent_group;
                } else {
                    group = this.group;
                    filter = filter_group;
                }
                var idx = group.indexOf(this);
                if (~idx) {
                    var length = group.length;
                    var n = 1;
                    while ((Object.keys(id2record).length < limit) &&
                        ((idx - n >= 0) || (idx + n < length)) &&
                        (n < 2 * limit)) {
                            var record;
                            if (idx - n >= 0) {
                                record = group[idx - n];
                                if (filter(record)) {
                                    id2record[record.id] = record;
                                }
                            }
                            if (idx + n < length) {
                                record = group[idx + n];
                                if (filter(record)) {
                                    id2record[record.id] = record;
                                }
                            }
                            n++;
                        }
                }
            }

            for (fname in this.model.fields) {
                if (!this.model.fields.hasOwnProperty(fname)) {
                    continue;
                }
                if ((this.model.fields[fname].description.type == 'binary') &&
                        ~fnames_to_fetch.indexOf(fname, fnames_to_fetch)) {
                    context[this.model.name + '.' + fname] = 'size';
                }
            }
            prm = this.model.execute('read', [Object.keys(id2record).map(
                        function (e) { return parseInt(e, 10); }),
                    fnames_to_fetch], context);
            var succeed = function(values, exception) {
                if (exception === undefined) exception = false;
                var id2value = {};
                values.forEach(function(e, i, a) {
                    id2value[e.id] = e;
                });
                for (var id in id2record) {
                    if (!id2record.hasOwnProperty(id)) {
                        continue;
                    }
                    var record = id2record[id];
                    if (!record.exception) {
                        record.exception = exception;
                    }
                    var value = id2value[id];
                    if (record && value) {
                        for (var key in this._changed) {
                            if (!this._changed.hasOwnProperty(key)) {
                                continue;
                            }
                            delete value[key];
                        }
                        record.set(value);
                    }
                }
            }.bind(this);
            var failed = function() {
                var failed_values = [];
                var default_values;
                for (var id in id2record) {
                    default_values = {
                        id: id
                    };
                    for (var i in fnames_to_fetch) {
                        default_values[fnames_to_fetch[i]] = null;
                    }
                    failed_values.push(default_values);
                }
                succeed(failed_values, true);
            };
            this.group.prm = prm.then(succeed, failed);
            return this.group.prm;
        },
        set: function(values) {
            var name, value;
            var rec_named_fields = ['many2one', 'one2one', 'reference'];
            var later = {};
            for (name in values) {
                if (!values.hasOwnProperty(name)) {
                    continue;
                }
                value = values[name];
                if (name == '_timestamp') {
                    // Always keep the older timestamp
                    if (!this._timestamp) {
                        this._timestamp = value;
                    }
                    continue;
                }
                if (!(name in this.model.fields)) {
                    if (name == 'rec_name') {
                        this._values[name] = value;
                    }
                    continue;
                }
                if (this.model.fields[name] instanceof Sao.field.One2Many) {
                    later[name] = value;
                }
                if ((this.model.fields[name] instanceof Sao.field.Many2One) ||
                        (this.model.fields[name] instanceof Sao.field.Reference)) {
                    var field_rec_name = name + '.rec_name';
                    if (values.hasOwnProperty(field_rec_name)) {
                        this._values[field_rec_name] = values[field_rec_name];
                    }
                    else if (this._values.hasOwnProperty(field_rec_name)) {
                        delete this._values[field_rec_name];
                    }
                }
                this.model.fields[name].set(this, value);
                this._loaded[name] = true;
            }
            for (name in later) {
                value = later[name];
                this.model.fields[name].set(this, value);
                this._loaded[name] = true;
            }
        },
        get: function() {
            var value = {};
            for (var name in this.model.fields) {
                if (!this.model.fields.hasOwnProperty(name)) {
                    continue;
                }
                var field = this.model.fields[name];
                if (field.description.readonly) {
                    continue;
                }
                if ((this._changed[name] === undefined) && this.id >= 0) {
                    continue;
                }
                value[name] = field.get(this);
            }
            return value;
        },
        invalid_fields: function() {
            var fields = {};
            for (var fname in this.model.fields) {
                var field = this.model.fields[fname];
                var invalid = field.get_state_attrs(this).invalid;
                if (invalid) {
                    fields[fname] = invalid;
                }
            }
            return fields;
        },
        get_context: function() {
            return this.group.context();
        },
        field_get: function(name) {
            return this.model.fields[name].get(this);
        },
        field_set: function(name, value) {
            this.model.fields[name].set(this, value);
        },
        field_get_client: function(name) {
            return this.model.fields[name].get_client(this);
        },
        field_set_client: function(name, value, force_change) {
            this.model.fields[name].set_client(this, value, force_change);
        },
        default_get: function() {
            var dfd = jQuery.Deferred();
            var promises = [];
            // Ensure promisses is filled before default_get is resolved
            for (var fname in this.model.fields) {
                var field = this.model.fields[fname];
                if (field.description.autocomplete &&
                        field.description.autocomplete.length > 0) {
                    promises.push(this.do_autocomplete(fname));
                }
            }
            if (!jQuery.isEmptyObject(this.model.fields)) {
                var prm = this.model.execute('default_get',
                        [Object.keys(this.model.fields)], this.get_context());
                prm.then(function(values) {
                    if (this.group.parent &&
                            this.group.parent_name in this.group.model.fields) {
                        var parent_field =
                            this.group.model.fields[this.group.parent_name];
                        if (parent_field instanceof Sao.field.Reference) {
                            values[this.group.parent_name] = [
                                this.group.parent.model.name,
                                this.group.parent.id];
                        } else if (parent_field.description.relation ==
                                this.group.parent.model.name) {
                            values[this.group.parent_name] =
                                this.group.parent.id;
                        }
                    }
                    promises.push(this.set_default(values));
                    jQuery.when.apply(jQuery, promises).then(function() {
                        dfd.resolve(values);
                    });
                }.bind(this));
            }
            return dfd;
        },
        set_default: function(values, validate) {
            if (validate === null) {
                validate = true;
            }
            var promises = [];
            var fieldnames = [];
            var exclude_fields = [];
            this.group.screens.forEach(function(screen){
                if (screen.exclude_field){
                    exclude_fields.push(screen.exclude_field);
                }
            });
            for (var fname in values) {
                if (!values.hasOwnProperty(fname)) {
                    continue;
                }
                if (exclude_fields.indexOf(fname) >= 0){
                    continue;
                }
                var value = values[fname];
                if (!(fname in this.model.fields)) {
                    continue;
                }
                if ((this.model.fields[fname] instanceof Sao.field.Many2One) ||
                        (this.model.fields[fname] instanceof Sao.field.Reference)) {
                    var field_rec_name = fname + '.rec_name';
                    if (values.hasOwnProperty(field_rec_name)) {
                        this._values[field_rec_name] = values[field_rec_name];
                    } else if (this._values.hasOwnProperty(field_rec_name)) {
                        delete this._values[field_rec_name];
                    }
                }
                promises.push(this.model.fields[fname].set_default(this, value));
                this._loaded[fname] = true;
                fieldnames.push(fname);
            }
            return jQuery.when.apply(jQuery, promises).then(function() {
                return this.on_change(fieldnames).then(function() {
                    return this.on_change_with(fieldnames).then(function() {
                        var callback = function() {
                            return this.group.root_group().screens
                                .forEach(function(screen) {
                                    return screen.display();
                                });
                        }.bind(this);
                        if (validate) {
                            return this.validate(null, true).then(callback);
                        } else {
                            return callback();
                        }
                    }.bind(this));
                }.bind(this));
            }.bind(this));
        },
        get_timestamp: function() {
            var timestamps = {};
            timestamps[this.model.name + ',' + this.id] = this._timestamp;
            for (var fname in this.model.fields) {
                if (!this.model.fields.hasOwnProperty(fname)) {
                    continue;
                }
                if (!(fname in this._loaded)) {
                    continue;
                }
                jQuery.extend(timestamps,
                    this.model.fields[fname].get_timestamp(this));
            }
            return timestamps;
        },
        get_eval: function() {
            var value = {};
            for (var key in this.model.fields) {
                if (!this.model.fields.hasOwnProperty(key) && this.id >= 0)
                    continue;
                value[key] = this.model.fields[key].get_eval(this);
            }
            return value;
        },
        get_on_change_value: function(skip) {
            var value = {};
            for (var key in this.model.fields) {
                if (skip && ~skip.indexOf(key)) {
                    continue;
                }
                if ((this.id >= 0) &&
                        (!this._loaded[key] || !this._changed[key])) {
                    continue;
                }
                value[key] = this.model.fields[key].get_on_change_value(this);
            }
            value.id = this.id;
            return value;
        },
        _get_on_change_args: function(args) {
            var result = {};
            var values = Sao.common.EvalEnvironment(this, 'on_change');
            args.forEach(function(arg) {
                var scope = values;
                arg.split('.').forEach(function(e) {
                    if (scope !== undefined) {
                        scope = scope[e];
                    }
                });
                result[arg] = scope;
            });
            result.id = this.id;
            return result;
        },
        on_change: function(fieldnames) {
            var values = {};
            fieldnames.forEach(function(fieldname) {
                var on_change = this.model.fields[fieldname]
                .description.on_change;
                if (!jQuery.isEmptyObject(on_change)) {
                    values = jQuery.extend(values,
                        this._get_on_change_args(on_change));
                }
            }.bind(this));
            if (!jQuery.isEmptyObject(values)) {
                var prm = this.model.execute('on_change',
                        [values, fieldnames], this.get_context());
                return prm.then(function(changes) {
                    changes.forEach(this.set_on_change.bind(this));
                }.bind(this));
            } else {
                return jQuery.when();
            }
        },
        on_change_with: function(field_names) {
            var fieldnames = {};
            var values = {};
            var later = {};
            var fieldname, on_change_with;
            for (fieldname in this.model.fields) {
                if (!this.model.fields.hasOwnProperty(fieldname)) {
                    continue;
                }
                on_change_with = this.model.fields[fieldname]
                    .description.on_change_with;
                if (jQuery.isEmptyObject(on_change_with)) {
                    continue;
                }
                for (var i = 0; i < field_names.length; i++) {
                    if (~on_change_with.indexOf(field_names[i])) {
                        break;
                    }
                }
                if (i >= field_names.length) {
                    continue;
                }
                if (!jQuery.isEmptyObject(Sao.common.intersect(
                                Object.keys(fieldnames).sort(),
                                on_change_with.sort()))) {
                    later[fieldname] = true;
                    continue;
                }
                fieldnames[fieldname] = true;
                values = jQuery.extend(values,
                        this._get_on_change_args(on_change_with));
                if ((this.model.fields[fieldname] instanceof
                            Sao.field.Many2One) ||
                        (this.model.fields[fieldname] instanceof
                         Sao.field.Reference)) {
                    delete this._values[fieldname + '.rec_name'];
                }
            }
            var prms = [];
            var prm;
            if (!jQuery.isEmptyObject(fieldnames)) {
                prm = this.model.execute('on_change_with',
                        [values, Object.keys(fieldnames)], this.get_context());
                prms.push(prm.then(this.set_on_change.bind(this)));
            }
            var set_on_change = function(fieldname) {
                return function(result) {
                    this.model.fields[fieldname].set_on_change(this, result);
                };
            };
            for (fieldname in later) {
                if (!later.hasOwnProperty(fieldname)) {
                    continue;
                }
                on_change_with = this.model.fields[fieldname]
                    .description.on_change_with;
                values = this._get_on_change_args(on_change_with);
                prm = this.model.execute('on_change_with_' + fieldname,
                    [values], this.get_context());
                prms.push(prm.then(set_on_change(fieldname).bind(this)));
            }
            return jQuery.when.apply(jQuery, prms);
        },
        set_on_change: function(values) {
            var fieldname, value;
            for (fieldname in values) {
                if (!values.hasOwnProperty(fieldname)) {
                    continue;
                }
                value = values[fieldname];
                if (!(fieldname in this.model.fields)) {
                    continue;
                }
                if ((this.model.fields[fieldname] instanceof
                            Sao.field.Many2One) ||
                        (this.model.fields[fieldname] instanceof
                         Sao.field.Reference)) {
                    var field_rec_name = fieldname + '.rec_name';
                    if (values.hasOwnProperty(field_rec_name)) {
                        this._values[field_rec_name] = values[field_rec_name];
                    } else if (this._values.hasOwnProperty(field_rec_name)) {
                        delete this._values[field_rec_name];
                    }
                }
                this.model.fields[fieldname].set_on_change(this, value);
            }
        },
        autocomplete_with: function(fieldname) {
            var promises = [];
            for (var fname in this.model.fields) {
                var field = this.model.fields[fname];
                var autocomplete = field.description.autocomplete || [];
                if (!~autocomplete.indexOf(fieldname)) {
                    continue;
                }
                promises.push(this.do_autocomplete(fname));
            }
            return jQuery.when.apply(jQuery, promises);
        },
        do_autocomplete: function(fieldname) {
            this.autocompletion[fieldname] = [];
            var field = this.model.fields[fieldname];
            var autocomplete = field.description.autocomplete;
            var values = this._get_on_change_args(autocomplete);
            var prm = this.model.execute(
                    'autocomplete_' + fieldname, [values], this.get_context());
            return prm.then(function(result) {
                this.autocompletion[fieldname] = result;
            }.bind(this));
        },
        expr_eval: function(expr) {
            if (typeof(expr) != 'string') return expr;
            var ctx = jQuery.extend({}, this.model.session.context);
            ctx.context = jQuery.extend({}, ctx);
            jQuery.extend(ctx.context, this.get_context());
            jQuery.extend(ctx, this.get_eval());
            ctx.active_model = this.model.name;
            ctx.active_id = this.id;
            ctx._user = this.model.session.user_id;
            if (this.group.parent && this.group.parent_name) {
                var parent_env = Sao.common.EvalEnvironment(this.group.parent);
                ctx['_parent_' + this.group.parent_name] = parent_env;
            }
            return new Sao.PYSON.Decoder(ctx).decode(expr);
        },
        rec_name: function() {
            var prm = this.model.execute('read', [[this.id], ['rec_name']],
                    this.get_context());
            return prm.then(function(values) {
                return values[0].rec_name;
            });
        },
        validate: function(fields, softvalidation, pre_validate, sync) {
            var validate_fields = function() {
                var result = true;
                var exclude_fields = [];
                this.group.screens.forEach(function(screen) {
                    if (screen.exclude_field) {
                        exclude_fields.push(screen.exclude_field);
                    }
                });
                for (var fname in this.model.fields) {
                    // Skip not loaded fields if sync and record is not new
                    if (sync && this.id >= 0 && !(fname in this._loaded)) {
                        continue;
                    }
                    if (!this.model.fields.hasOwnProperty(fname)) {
                        continue;
                    }
                    var field = this.model.fields[fname];
                    if (fields && !~fields.indexOf(fname)) {
                        continue;
                    }
                    if (field.get_state_attrs(this).readonly) {
                        continue;
                    }
                    if (~exclude_fields.indexOf(fname)) {
                        continue;
                    }
                    if (!field.validate(this, softvalidation, pre_validate)) {
                        result = false;
                    }
                }
                return result;
            }.bind(this);
            if (sync) {
                return validate_fields();
            } else {
                return this._check_load(fields).then(validate_fields);
            }
        },
        pre_validate: function() {
            if (jQuery.isEmptyObject(this._changed)) {
                return jQuery.Deferred().resolve(true);
            }
            var values = this._get_on_change_args(Object.keys(this._changed));
            return this.model.execute('pre_validate',
                    [values], this.get_context())
                .then(function() {
                    return true;
                }, function() {
                    return false;
                });
        },
        cancel: function() {
            this._loaded = {};
            this._changed = {};
            this._timestamp = null;
        },
        _check_load: function(fields) {
            if (!this.get_loaded(fields)) {
                return this.reload(fields);
            }
            return jQuery.when();
        },
        get_loaded: function(fields) {
            if (!jQuery.isEmptyObject(fields)) {
                var result = true;
                fields.forEach(function(field) {
                    if (!(field in this._loaded) && !(field in this._changed)) {
                        result = false;
                    }
                }.bind(this));
                return result;
            }
            return Sao.common.compare(Object.keys(this.model.fields).sort(),
                    Object.keys(this._loaded).sort());
        },
        root_parent: function root_parent() {
            var parent = this;
            while (parent.group.parent) {
                parent = parent.group.parent;
            }
            return parent;
        },
        get_path: function(group) {
            var path = [];
            var i = this;
            var child_name = '';
            while (i) {
                path.push([child_name, i.id]);
                if (i.group === group) {
                    break;
                }
                child_name = i.group.child_name;
                i = i.group.parent;
            }
            path.reverse();
            return path;
        },
        deleted: function() {
            return Boolean(~this.group.record_deleted.indexOf(this));
        },
        removed: function() {
            return Boolean(~this.group.record_removed.indexOf(this));
        },
        readonly: function() {
            return this.deleted() || this.removed() || this.exception;
        },
        set_field_context: function() {
            for (var name in this.model.fields) {
                if (!this.model.fields.hasOwnProperty(name)) {
                    continue;
                }
                var field = this.model.fields[name];
                var value = this._values[name];
                if (!value || !value.set_context) {
                    continue;
                }
                var context = field.description.context;
                if (context) {
                    value.set_context(this.expr_eval(context));
                }
            }
        },
        get_attachment_count: function(reload) {
            var prm = jQuery.Deferred();
            if (this.id < 0) {
                prm.resolve(0);
                return prm;
            }
            if ((this.attachment_count < 0) || reload) {
                prm = Sao.rpc({
                    method: 'model.ir.attachment.search_count',
                    params: [
                    [['resource', '=', this.model.name + ',' + this.id]],
                    this.get_context()]
                }, this.model.session).then(function(count) {
                    this.attachment_count = count;
                    return count;
                }.bind(this));
            } else {
                prm.resolve(this.attachment_count);
            }
            return prm;
        },
        get_unread_note: function(reload) {
            var prm = jQuery.Deferred();
            if (this.id < 0) {
                prm.resolve(0);
                return prm;
            }
            if ((this.unread_note < 0) || reload) {
                prm = Sao.rpc({
                    method: 'model.ir.note.search_count',
                    params: [
                        [['resource', '=', this.model.name + ',' + this.id],
                        ['unread', '=', true]],
                        this.get_context()]
                }, this.model.session).then(function(count) {
                    this.unread_note = count;
                    return count;
                }.bind(this));
            } else {
                prm.resolve(this.unread_note);
            }
            return prm;
        }
    });


    Sao.field = {};

    Sao.field.get = function(type) {
        switch (type) {
            case 'char':
                return Sao.field.Char;
            case 'selection':
                return Sao.field.Selection;
            case 'datetime':
                return Sao.field.DateTime;
            case 'date':
                return Sao.field.Date;
            case 'time':
                return Sao.field.Time;
            case 'timedelta':
                return Sao.field.TimeDelta;
            case 'float':
                return Sao.field.Float;
            case 'numeric':
                return Sao.field.Numeric;
            case 'integer':
                return Sao.field.Integer;
            case 'boolean':
                return Sao.field.Boolean;
            case 'many2one':
                return Sao.field.Many2One;
            case 'one2one':
                return Sao.field.One2One;
            case 'one2many':
                return Sao.field.One2Many;
            case 'many2many':
                return Sao.field.Many2Many;
            case 'reference':
                return Sao.field.Reference;
            case 'binary':
                return Sao.field.Binary;
            case 'dict':
                return Sao.field.Dict;
            default:
                return Sao.field.Char;
        }
    };

    Sao.field.Field = Sao.class_(Object, {
        _default: null,
        init: function(description) {
            this.description = description;
            this.name = description.name;
        },
        set: function(record, value) {
            record._values[this.name] = value;
        },
        get: function(record) {
            var value = record._values[this.name];
            if (value === undefined) {
                value = this._default;
            }
            return value;
        },
        set_client: function(record, value, force_change) {
            var previous_value = this.get(record);
            this.set(record, value);
            // Use stringify to compare object instance like Number for Decimal
            if (JSON.stringify(previous_value) !=
                JSON.stringify(this.get(record))) {
                record._changed[this.name] = true;
                this.changed(record).done(function() {
                    record.validate(null, true).then(function() {
                        record.group.changed().done(function() {
                            var root_group = record.group.root_group();
                            root_group.screens.forEach(function(screen) {
                                screen.display();
                            });
                        });
                    });
                });
            } else if (force_change) {
                record._changed[this.name] = true;
                this.changed(record).done(function() {
                    record.validate(null, true).then(function() {
                        var root_group = record.group.root_group();
                        root_group.screens.forEach(function(screen) {
                            screen.display();
                        });
                    });
                });
            }
        },
        get_client: function(record) {
            return this.get(record);
        },
        set_default: function(record, value) {
            record._values[this.name] = value;
            record._changed[this.name] = true;
        },
        set_on_change: function(record, value) {
            record._values[this.name] = value;
            record._changed[this.name] = true;
        },
        changed: function(record) {
            var prms = [];
            prms.push(record.on_change([this.name]));
            prms.push(record.on_change_with([this.name]));
            prms.push(record.autocomplete_with(this.name));
            record.set_field_context();
            return jQuery.when.apply(jQuery, prms);
        },
        get_timestamp: function(record) {
            return {};
        },
        get_context: function(record) {
            var context = jQuery.extend({}, record.get_context());
            if (record.group.parent) {
                jQuery.extend(context, record.group.parent.get_context());
            }
            jQuery.extend(context,
                record.expr_eval(this.description.context || {}));
            return context;
        },
        get_domains: function(record, pre_validate) {
            var inversion = new Sao.common.DomainInversion();
            var screen_domain = inversion.domain_inversion(
                    [record.group.domain4inversion(), pre_validate || []],
                    this.name, Sao.common.EvalEnvironment(record));
            if ((typeof screen_domain == 'boolean') && !screen_domain) {
                screen_domain = [['id', '=', null]];
            } else if ((typeof screen_domain == 'boolean') && screen_domain) {
                screen_domain = [];
            }
            var attr_domain = record.expr_eval(this.description.domain || []);
            return [screen_domain, attr_domain];
        },
        get_domain: function(record) {
            var domains = this.get_domains(record);
            var screen_domain = domains[0];
            var attr_domain = domains[1];
            var inversion = new Sao.common.DomainInversion();
            return inversion.concat(
                    [inversion.localize_domain(screen_domain), attr_domain]);
        },
        validation_domains: function(record, pre_validate) {
            var inversion = new Sao.common.DomainInversion();
            return inversion.concat(this.get_domains(record, pre_validate));
        },
        get_eval: function(record) {
            return this.get(record);
        },
        get_on_change_value: function(record) {
            return this.get_eval(record);
        },
        set_state: function(record, states) {
            if (states === undefined) {
                states = ['readonly', 'required', 'invisible'];
            }
            var state_changes = record.expr_eval(
                    this.description.states || {});
            states.forEach(function(state) {
                if ((state == 'readonly') && this.description.readonly) {
                    return;
                }
                if (state_changes[state] !== undefined) {
                    this.get_state_attrs(record)[state] = state_changes[state];
                } else if (this.description[state] !== undefined) {
                    this.get_state_attrs(record)[state] =
                        this.description[state];
                }
            }.bind(this));
            if (record.group.get_readonly() ||
                    this.get_state_attrs(record).domain_readonly) {
                this.get_state_attrs(record).readonly = true;
            }
        },
        get_state_attrs: function(record) {
            if (!(this.name in record.state_attrs)) {
                record.state_attrs[this.name] = jQuery.extend(
                        {}, this.description);
            }
            if (record.group.get_readonly() || record.readonly()) {
                record.state_attrs[this.name].readonly = true;
            }
            return record.state_attrs[this.name];
        },
        check_required: function(record) {
            var state_attrs = this.get_state_attrs(record);
            if (state_attrs.required == 1) {
                if (!this.get(record) && (state_attrs.readonly != 1)) {
                    return false;
                }
            }
            return true;
        },
        validate: function(record, softvalidation, pre_validate) {
            if (this.description.readonly) {
                return true;
            }
            var invalid = false;
            this.get_state_attrs(record).domain_readonly = false;
            var inversion = new Sao.common.DomainInversion();
            var domain = inversion.simplify(this.validation_domains(record,
                        pre_validate));
            if (!softvalidation) {
                if (!this.check_required(record)) {
                    invalid = 'required';
                }
            }
            if (typeof domain == 'boolean') {
                if (!domain) {
                    invalid = 'domain';
                }
            } else if (Sao.common.compare(domain, [['id', '=', null]])) {
                invalid = 'domain';
            } else {
                var uniques = inversion.unique_value(domain);
                var unique = uniques[0];
                var leftpart = uniques[1];
                var value = uniques[2];
                if (unique) {
                    // If the inverted domain is so constraint that only one
                    // value is possible we should use it. But we must also pay
                    // attention to the fact that the original domain might be
                    // a 'OR' domain and thus not preventing the modification
                    // of fields.
                    if (value === false) {
                        // XXX to remove once server domains are fixed
                        value = null;
                    }
                    var setdefault = true;
                    var original_domain;
                    if (!jQuery.isEmptyObject(record.group.domain())) {
                        original_domain = inversion.merge(record.group.domain());
                    } else {
                        original_domain = inversion.merge(domain);
                    }
                    var domain_readonly = original_domain[0] == 'AND';
                    if (leftpart.contains('.')) {
                        var recordpart = leftpart.split('.', 1)[0];
                        var localpart = leftpart.split('.', 1)[1];
                        var constraintfields = [];
                        if (domain_readonly) {
                            inversion.localize_domain(
                                    original_domain.slice(1))
                                .forEach(function(leaf) {
                                    constraintfields.push(leaf);
                                });
                        }
                        if ((localpart != 'id') ||
                                !~constraintfields.indexOf(recordpart)) {
                            setdefault = false;
                        }
                    }
                    if (setdefault && !pre_validate) {
                        this.set_client(record, value);
                        this.get_state_attrs(record).domain_readonly =
                            domain_readonly;
                    }
                }
                if (!inversion.eval_domain(domain,
                            Sao.common.EvalEnvironment(record))) {
                    invalid = domain;
                }
            }
            this.get_state_attrs(record).invalid = invalid;
            return !invalid;
        }
    });

    Sao.field.Char = Sao.class_(Sao.field.Field, {
        _default: '',
        get: function(record) {
            return Sao.field.Char._super.get.call(this, record) || this._default;
        }
    });

    Sao.field.Selection = Sao.class_(Sao.field.Field, {
        _default: null
    });

    Sao.field.DateTime = Sao.class_(Sao.field.Field, {
        _default: null,
        time_format: function(record) {
            return record.expr_eval(this.description.format);
        },
        set_client: function(record, value, force_change) {
            var current_value;
            if (value) {
                if (value.isTime) {
                    current_value = this.get(record);
                    if (current_value) {
                        value = Sao.DateTime.combine(current_value, value);
                    } else {
                        value = null;
                    }
                } else if (value.isDate) {
                    current_value = this.get(record);
                    if (current_value) {
                        value = Sao.DateTime.combine(value, current_value);
                    }
                }
            }
            Sao.field.DateTime._super.set_client.call(this, record, value,
                force_change);
        },
        date_format: function(record) {
            var context = this.get_context(record);
            return Sao.common.date_format(context.date_format);
        }
    });

    Sao.field.Date = Sao.class_(Sao.field.Field, {
        _default: null,
        set_client: function(record, value, force_change) {
            if (value && !value.isDate) {
                value.isDate = true;
                value.isDateTime = false;
            }
            Sao.field.Date._super.set_client.call(this, record, value,
                force_change);
        },
        date_format: function(record) {
            var context = this.get_context(record);
            return Sao.common.date_format(context.date_format);
        }
    });

    Sao.field.Time = Sao.class_(Sao.field.Field, {
        _default: null,
        time_format: function(record) {
            return record.expr_eval(this.description.format);
        },
        set_client: function(record, value, force_change) {
            if (value && (value.isDate || value.isDateTime)) {
                value = Sao.Time(value.hour(), value.minute(),
                    value.second(), value.millisecond());
            }
            Sao.field.Time._super.set_client.call(this, record, value,
                force_change);
        }
    });

    Sao.field.TimeDelta = Sao.class_(Sao.field.Field, {
        _default: null,
        converter: function(record) {
            // TODO allow local context converter
            return record.model.session.context[this.description.converter];
        },
        set_client: function(record, value, force_change) {
            if (typeof(value) == 'string') {
                value = Sao.common.timedelta.parse(value, this.converter(record));
            }
            Sao.field.TimeDelta._super.set_client.call(
                this, record, value, force_change);
        },
        get_client: function(record) {
            var value = Sao.field.TimeDelta._super.get_client.call(
                this, record);
            return Sao.common.timedelta.format(value, this.converter(record));
        }
    });

    Sao.field.Float = Sao.class_(Sao.field.Field, {
        _default: null,
        digits: function(record, factor) {
            if (factor === undefined) {
                factor = 1;
            }
            var digits = record.expr_eval(this.description.digits);
            if (!digits || !digits.every(function(e) {
                return e !== null;
            })) {
                return;
            }
            var shift = Math.round(Math.log(Math.abs(factor)) / Math.LN10);
            return [digits[0] + shift, digits[1] - shift];
        },
        check_required: function(record) {
            var state_attrs = this.get_state_attrs(record);
            if (state_attrs.required == 1) {
                if ((this.get(record) === null) &&
                    (state_attrs.readonly != 1)) {
                    return false;
                }
            }
            return true;
        },
        convert: function(value) {
            if (!value) {
                return null;
            }
            value = Number(value);
            if (isNaN(value)) {
                value = this._default;
            }
            return value;
        },
        apply_factor: function(value, factor) {
            if (value !== null) {
                value /= factor;
            }
            return value;
        },
        set_client: function(record, value, force_change, factor) {
            if (factor === undefined) {
                factor = 1;
            }
            value = this.apply_factor(this.convert(value), factor);
            Sao.field.Float._super.set_client.call(this, record, value,
                force_change);
        },
        get_client: function(record, factor) {
            if (factor === undefined) {
                factor = 1;
            }
            var value = this.get(record);
            if (value !== null) {
                var digits = this.digits(record, factor);
                if (digits) {
                    return (value * factor).toFixed(digits[1]);
                } else {
                    return '' + (value * factor);
                }
            } else {
                return '';
            }
        }
    });

    Sao.field.Numeric = Sao.class_(Sao.field.Float, {
        convert: function(value) {
            if (!value) {
                return null;
            }
            value = new Sao.Decimal(value);
            if (isNaN(value.valueOf())) {
                value = this._default;
            }
            return value;
        },
        apply_factor: function(value, factor) {
            value = Sao.field.Numeric._super.apply_factor(value, factor);
            if (value !== null) {
                value = new Sao.Decimal(value);
            }
            return value;
        }
    });

    Sao.field.Integer = Sao.class_(Sao.field.Float, {
        convert: function(value) {
            value = parseInt(value, 10);
            if (isNaN(value)) {
                value = this._default;
            }
            return value;
        }
    });

    Sao.field.Boolean = Sao.class_(Sao.field.Field, {
        _default: false,
        set_client: function(record, value, force_change) {
            value = Boolean(value);
            Sao.field.Boolean._super.set_client.call(this, record, value,
                force_change);
        },
        get: function(record) {
            return Boolean(record._values[this.name]);
        },
        get_client: function(record) {
            return Boolean(record._values[this.name]);
        }
    });

    Sao.field.Many2One = Sao.class_(Sao.field.Field, {
        _default: null,
        check_required: function(record) {
            var state_attrs = this.get_state_attrs(record);
            if (state_attrs.required == 1) {
                if ((this.get(record) === null) &&
                    (state_attrs.readonly != 1)) {
                    return false;
                }
            }
            return true;
        },
        get_client: function(record) {
            var rec_name = record._values[this.name + '.rec_name'];
            if (rec_name === undefined) {
                var prm = this.set(record, this.get(record));
                if (prm !== null){
                    return prm.then(function(){
                        return record._values[this.name + '.rec_name'] || '';
                    }.bind(this));
                } else {
                    return record._values[this.name + '.rec_name'] || '';
                }
            }
            return rec_name;
        },
        set: function(record, value) {
            var prm = null;
            var rec_name = record._values[this.name + '.rec_name'] || '';
            var store_rec_name = function(rec_name) {
                record._values[this.name + '.rec_name'] = rec_name[0].rec_name;
            };
            if (!rec_name && (value >= 0) && (value !== null)) {
                var model_name = record.model.fields[this.name].description
                    .relation;
                prm = Sao.rpc({
                    'method': 'model.' + model_name + '.read',
                    'params': [[value], ['rec_name'], record.get_context()]
                }, record.model.session).done(store_rec_name.bind(this)).done(
                        function() {
                            record.group.root_group().screens.forEach(
                                function(screen) {
                                    screen.display();
                            });
                       });
            } else {
                store_rec_name.call(this, [{'rec_name': rec_name}]);
            }
            record._values[this.name] = value;
            return prm;
        },
        set_client: function(record, value, force_change) {
            var rec_name;
            if (value instanceof Array) {
                rec_name = value[1];
                value = value[0];
            } else {
                if (value == this.get(record)) {
                    rec_name = record._values[this.name + '.rec_name'] || '';
                } else {
                    rec_name = '';
                }
            }
            record._values[this.name + '.rec_name'] = rec_name;
            Sao.field.Many2One._super.set_client.call(this, record, value,
                    force_change);
        },
        validation_domains: function(record, pre_validate) {
            return this.get_domains(record, pre_validate)[0];
        },
        get_domain: function(record) {
            var domains = this.get_domains(record);
            var screen_domain = domains[0];
            var attr_domain = domains[1];
            var inversion = new Sao.common.DomainInversion();
            return inversion.concat([inversion.localize_domain(
                        inversion.inverse_leaf(screen_domain), this.name),
                    attr_domain]);
        },
        get_on_change_value: function(record) {
            if ((record.group.parent_name == this.name) &&
                    record.group.parent) {
                return record.group.parent.get_on_change_value(
                        [record.group.child_name]);
            }
            return Sao.field.Many2One._super.get_on_change_value.call(
                    this, record);
        }
    });

    Sao.field.One2One = Sao.class_(Sao.field.Many2One, {
    });

    Sao.field.One2Many = Sao.class_(Sao.field.Field, {
        init: function(description) {
            Sao.field.One2Many._super.init.call(this, description);
        },
        _default: null,
        _set_value: function(record, value, default_) {
            this._set_default_value(record);
            var group = record._values[this.name];
            var prm = jQuery.when();
            if (jQuery.isEmptyObject(value)) {
                return prm;
            }
            var mode;
            if (!isNaN(parseInt(value[0], 10))) {
                mode = 'list ids';
            } else {
                mode = 'list values';
            }
            if (mode == 'list values') {
                var context = this.get_context(record);
                var field_names = {};
                value.forEach(function(val) {
                    for (var fieldname in val) {
                        if (!val.hasOwnProperty(fieldname)) {
                            continue;
                        }
                        if (!(fieldname in group.model.fields) &&
                                (!~fieldname.indexOf('.'))) {
                            field_names[fieldname] = true;
                        }
                    }
                });
                if (!jQuery.isEmptyObject(field_names)) {
                    var args = {
                        'method': 'model.' + this.description.relation +
                            '.fields_get',
                        'params': [Object.keys(field_names), context]
                    };
                    prm = Sao.rpc(args, record.model.session);
                }
            }
            var set_value = function(fields) {
                var promises = [];
                if (!jQuery.isEmptyObject(fields)) {
                    group.model.add_fields(fields);
                }
                record._values[this.name] = group;
                if (mode == 'list ids') {
                    for (var i = 0, len = group.length; i < len; i++) {
                        var old_record = group[i];
                        group.remove(old_record, true);
                    }
                    group.load(value);
                } else {
                    value.forEach(function(vals) {
                        var new_record = group.new_(false);
                        if (default_) {
                            // Don't validate as parent will validate
                            promises.push(new_record.set_default(vals, false));
                            group.add(new_record, -1, false);
                        } else {
                            new_record.set(vals);
                            group.push(new_record);
                        }
                    });
                }
                return jQuery.when.apply(jQuery, promises);
            };
            return prm.then(set_value);
        },
        set: function(record, value, _default) {
            if (_default === undefined) {
                _default = false;
            }
            var group = record._values[this.name];
            var model;
            if (group !== undefined) {
                model = group.model;
                group.destroy();
            } else if (record.model.name == this.description.relation) {
                model = record.model;
            } else {
                model = new Sao.Model(this.description.relation);
            }
            record._values[this.name] = undefined;
            this._set_default_value(record, model);
            return this._set_value(record, value, _default);
        },
        get: function(record) {
            var group = record._values[this.name];
            if (group === undefined) {
                return [];
            }
            var record_removed = group.record_removed;
            var record_deleted = group.record_deleted;
            var result = [];
            var parent_name = this.description.relation_field || '';
            var to_add = [];
            var to_create = [];
            var to_write = [];
            for (var i = 0, len = group.length; i < len; i++) {
                var record2 = group[i];
                if (~record_removed.indexOf(record2) ||
                        ~record_deleted.indexOf(record2)) {
                    continue;
                }
                var values;
                if (record2.id >= 0) {
                    values = record2.get();
                    delete values[parent_name];
                    if (record2.has_changed() &&
                            !jQuery.isEmptyObject(values)) {
                        to_write.push([record2.id]);
                        to_write.push(values);
                    }
                    to_add.push(record2.id);
                } else {
                    values = record2.get();
                    delete values[parent_name];
                    to_create.push(values);
                }
            }
            if (!jQuery.isEmptyObject(to_add)) {
                result.push(['add', to_add]);
            }
            if (!jQuery.isEmptyObject(to_create)) {
                result.push(['create', to_create]);
            }
            if (!jQuery.isEmptyObject(to_write)) {
                result.push(['write'].concat(to_write));
            }
            if (!jQuery.isEmptyObject(record_removed)) {
                result.push(['remove', record_removed.map(function(r) {
                    return r.id;
                })]);
            }
            if (!jQuery.isEmptyObject(record_deleted)) {
                result.push(['delete', record_deleted.map(function(r) {
                    return r.id;
                })]);
            }
            return result;
        },
        set_client: function(record, value, force_change) {
            // domain inversion try to set None as value
            if (value === null) {
                value = [];
            }
            // domain inversion could try to set id as value
            if (typeof value == 'number') {
                value = [value];
            }

            var previous_ids = this.get_eval(record);
            this._set_value(record, value);
            if (!Sao.common.compare(previous_ids.sort(), value.sort())) {
                record._changed[this.name] = true;
                this.changed(record).done(function() {
                    record.validate(null, true).then(function() {
                        record.group.changed().done(function() {
                            var root_group = record.group.root_group();
                            root_group.screens.forEach(function(screen) {
                                screen.display();
                            });
                        });
                    });
                });
            } else if (force_change) {
                record._changed[this.name] = true;
                this.changed(record).done(function() {
                    record.validate(null, true).then(function() {
                        var root_group = record.group.root_group();
                        root_group.screens.forEach(function(screen) {
                            screen.display();
                        });
                    });
                });
            }
        },
        get_client: function(record) {
            this._set_default_value(record);
            return record._values[this.name];
        },
        set_default: function(record, value) {
            record._changed[this.name] = true;
            return this.set(record, value, true);
        },
        set_on_change: function(record, value) {
            record._changed[this.name] = true;
            this._set_default_value(record);
            if (value instanceof Array) {
                this._set_value(record, value);
                return;
            }
            var prm = jQuery.when();
            if (value.add || value.update) {
                var context = this.get_context(record);
                var fields = record._values[this.name].model.fields;
                var field_names = {};
                var adding_values = [];
                if (value.add) {
                    for (var i=0; i < value.add.length; i++) {
                        adding_values.push(value.add[i][1]);
                    }
                }
                [adding_values, value.update].forEach(function(l) {
                    if (!jQuery.isEmptyObject(l)) {
                        l.forEach(function(v) {
                            Object.keys(v).forEach(function(f) {
                                if (!(f in fields) &&
                                    (f != 'id')) {
                                        field_names[f] = true;
                                    }
                            });
                        });
                    }
                });
                if (!jQuery.isEmptyObject(field_names)) {
                    var args = {
                        'method': 'model.' + this.description.relation +
                            '.fields_get',
                        'params': [Object.keys(field_names), context]
                    };
                    prm = Sao.rpc(args, record.model.session);
                }
            }

            var to_remove = [];
            var group = record._values[this.name];
            group.forEach(function(record2) {
                if (!record2.id) {
                    to_remove.push(record2);
                }
            });
            if (value.remove) {
                value.remove.forEach(function(record_id) {
                    var record2 = group.get(record_id);
                    if (record2) {
                        to_remove.push(record2);
                    }
                }.bind(this));
            }
            to_remove.forEach(function(record2) {
                group.remove(record2, false, true, false, false);
            }.bind(this));

            if (value.add || value.update) {
                prm.then(function(fields) {
                    group.model.add_fields(fields);
                    if (value.add) {
                        value.add.forEach(function(vals) {
                            var index = vals[0];
                            var data = vals[1];
                            var new_record = group.new_(false);
                            group.add(new_record, index, false);
                            new_record.set_on_change(data);
                        });
                    }
                    if (value.update) {
                        value.update.forEach(function(vals) {
                            if (!vals.id) {
                                return;
                            }
                            var record2 = group.get(vals.id);
                            if (record2) {
                                record2.set_on_change(vals);
                            }
                        });
                    }
                }.bind(this));
            }
        },
        _set_default_value: function(record, model) {
            if (record._values[this.name] !== undefined) {
                return;
            }
            if (!model) {
                model = new Sao.Model(this.description.relation);
            }
            if (record.model.name == this.description.relation) {
                model = record.model;
            }
            var context = record.expr_eval(this.description.context || {});
            var group = Sao.Group(model, context, []);
            group.set_parent(record);
            group.parent_name = this.description.relation_field;
            group.child_name = this.name;
            record._values[this.name] = group;
        },
        get_timestamp: function(record) {
            var group = record._values[this.name];
            if (group === undefined) {
                return {};
            }

            var timestamps = {};
            var record2;
            for (var i = 0, len = group.length; i < len; i++) {
                record2 = group[i];
                jQuery.extend(timestamps, record2.get_timestamp());
            }
            return timestamps;
        },
        get_eval: function(record) {
            var result = [];
            var group = record._values[this.name];
            if (group === undefined) return result;

            var record_removed = group.record_removed;
            var record_deleted = group.record_deleted;
            for (var i = 0, len = record._values[this.name].length; i < len;
                    i++) {
                var record2 = group[i];
                if (~record_removed.indexOf(record2) ||
                        ~record_deleted.indexOf(record2))
                    continue;
                result.push(record2.id);
            }
            return result;
        },
        get_on_change_value: function(record) {
            var result = [];
            var group = record._values[this.name];
            if (group === undefined) return result;
            for (var i = 0, len = record._values[this.name].length; i < len;
                    i++) {
                var record2 = group[i];
                if (!record2.deleted() || !record2.removed())
                    result.push(record2.get_on_change_value(
                                [this.description.relation_field || '']));
            }
            return result;
        },
        get_removed_ids: function(record) {
            return record._values[this.name].record_removed.map(function(r) {
                return r.id;
            });
        },
        get_domain: function(record) {
            var domains = this.get_domains(record);
            var screen_domain = domains[0];
            var attr_domain = domains[1];
            var inversion = new Sao.common.DomainInversion();
            return inversion.concat([inversion.localize_domain(
                        inversion.inverse_leaf(screen_domain), this.name),
                    attr_domain]);
        },
        validation_domains: function(record, pre_validate) {
            return this.get_domains(record, pre_validate)[0];
        },
        validate: function(record, softvalidation, pre_validate) {
            if (this.description.readonly) {
                return true;
            }
            var invalid = false;
            var inversion = new Sao.common.DomainInversion();
            var ldomain = inversion.localize_domain(inversion.domain_inversion(
                        record.group.clean4inversion(pre_validate || []), this.name,
                        Sao.common.EvalEnvironment(record)), this.name);
            if (typeof ldomain == 'boolean') {
                if (ldomain) {
                    ldomain = [];
                } else {
                    ldomain = [['id', '=', null]];
                }
            }
            for (var i = 0, len = (record._values[this.name] || []).length;
                    i < len; i++) {
                var record2 = record._values[this.name][i];
                // [Bug Sao]
                // TODO: report to tryton
                //      empty list equal false in python but true in js
                if (!record2.get_loaded() && (record2.id >= 0) &&
                    (!pre_validate || (pre_validate instanceof Array &&
                        pre_validate.length === 0))){
                    continue;
                }
                if (!record2.validate(null, softvalidation, ldomain, true)) {
                    invalid = 'children';
                }
            }
            var test = Sao.field.One2Many._super.validate.call(this, record,
                        softvalidation, pre_validate);
            if (test && invalid) {
                this.get_state_attrs(record).invalid = invalid;
                return false;
            }
            return test;
        },
        set_state: function(record, states) {
            this._set_default_value(record);
            Sao.field.One2Many._super.set_state.call(this, record, states);
            record._values[this.name].readonly = this.get_state_attrs(record)
                .readonly;
        }
    });

    Sao.field.Many2Many = Sao.class_(Sao.field.One2Many, {
        get_on_change_value: function(record) {
            return this.get_eval(record);
        }
    });

    Sao.field.Reference = Sao.class_(Sao.field.Field, {
        _default: null,
        get_client: function(record) {
            if (record._values[this.name]) {
                var model = record._values[this.name][0];
                var name = record._values[this.name + '.rec_name'] || '';
                return [model, name];
            } else {
                return null;
            }
        },
        get: function(record) {
            if (record._values[this.name] &&
                record._values[this.name][0] &&
                record._values[this.name][1] >= -1) {
                return record._values[this.name].join(',');
            }
            return null;
        },
        set_client: function(record, value, force_change) {
            if (value) {
                if (typeof(value) == 'string') {
                    value = value.split(',');
                }
                var ref_model = value[0];
                var ref_id = value[1];
                var rec_name;
                if (ref_id instanceof Array) {
                    rec_name = ref_id[1];
                    ref_id = ref_id[0];
                } else {
                    if (ref_id && !isNaN(parseInt(ref_id, 10))) {
                        ref_id = parseInt(ref_id, 10);
                    }
                    if ([ref_model, ref_id].join(',') == this.get(record)) {
                        rec_name = record._values[this.name + '.rec_name'] || '';
                    } else {
                        rec_name = '';
                    }
                }
                record._values[this.name + '.rec_name'] = rec_name;
                value = [ref_model, ref_id];
            }
            Sao.field.Reference._super.set_client.call(
                    this, record, value, force_change);
        },
        set: function(record, value) {
            if (!value) {
                record._values[this.name] = this._default;
                return;
            }
            var ref_model, ref_id;
            if (typeof(value) == 'string') {
                ref_model = value.split(',')[0];
                ref_id = value.split(',')[1];
                if (!ref_id) {
                    ref_id = null;
                } else if (!isNaN(parseInt(ref_id, 10))) {
                    ref_id = parseInt(ref_id, 10);
                }
            } else {
                ref_model = value[0];
                ref_id = value[1];
            }
            var rec_name = record._values[this.name + '.rec_name'] || '';
            var store_rec_name = function(rec_name) {
                record._values[this.name + '.rec_name'] = rec_name;
            }.bind(this);
            if (ref_model && ref_id !== null && ref_id >= 0) {
                if (!rec_name && ref_id >= 0) {
                    Sao.rpc({
                        'method': 'model.' + ref_model + '.read',
                        'params': [[ref_id], ['rec_name'], record.get_context()]
                    }, record.model.session).done(function(result) {
                        store_rec_name(result[0].rec_name);
                    });
                }
            } else if (ref_model) {
                rec_name = '';
            } else {
                rec_name = ref_id;
            }
            record._values[this.name] = [ref_model, ref_id];
            store_rec_name(rec_name);
        },
        get_on_change_value: function(record) {
            if ((record.group.parent_name == this.name) &&
                    record.group.parent) {
                return [record.group.parent.model.name,
                    record.group.parent.get_on_change_value(
                        [record.group.child_name])];
            }
            return Sao.field.Reference._super.get_on_change_value.call(
                    this, record);
        },
        validation_domains: function(record, pre_validate) {
            return this.get_domains(record, pre_validate)[0];
        },
        get_domain: function(record) {
            var model = null;
            if (record._values[this.name]) {
                model = record._values[this.name][0];
            }
            var domains = this.get_domains(record);
            var screen_domain = domains[0];
            var attr_domain = domains[1];
            var inversion = new Sao.common.DomainInversion();
            return inversion.concat([inversion.localize_domain(
                        inversion.filter_leaf(screen_domain, this.name, model),
                        true), attr_domain]);
        }
    });

    Sao.field.Binary = Sao.class_(Sao.field.Field, {
        _default: null,
        get_size: function(record) {
            var data = record._values[this.name] || 0;
            if (data instanceof Uint8Array) {
                return data.length;
            }
            return data;
        },
        get_data: function(record) {
            var data = record._values[this.name] || [];
            var prm = jQuery.when(data);
            if (!(data instanceof Uint8Array)) {
                if (record.id < 0) {
                    return prm;
                }
                var context = record.get_context();
                prm = record.model.execute('read', [[record.id], [this.name]],
                    context).then(function(data) {
                        return data[0][this.name];
                    }.bind(this));
            }
            return prm;
        }
    });

    Sao.field.Dict = Sao.class_(Sao.field.Field, {
        _default: {},
        get: function(record) {
            return (Sao.field.Dict._super.get.call(this, record) ||
                    this._default);
        },
        get_client: function(record) {
            return (Sao.field.Dict._super.get_client.call(this, record) ||
                    this._default);
        },
        validation_domains: function(record, pre_validate) {
            return this.get_domains(record, pre_validate)[0];
        },
        get_domain: function(record) {
            var inversion = new Sao.common.DomainInversion();
            var domains = this.get_domains(record);
            var screen_domain = domains[0];
            var attr_domain = domains[1];
            return inversion.concat([inversion.localize_domain(
                        inversion.inverse_leaf(screen_domain)),
                    attr_domain]);
        },
        date_format: function(record) {
            var context = this.get_context(record);
            return Sao.common.date_format(context.date_format);
        },
        time_format: function(record) {
            return '%X';
        }
    });
}());

/* This file is part of Tryton.  The COPYRIGHT file at the top level of
   this repository contains the full copyright notices and license terms. */
(function() {
    'use strict';

    Sao.Tab = Sao.class_(Object, {
        init: function() {
            Sao.Tab.tabs.push(this);
            this.buttons = {};
            this.id = 'tab-' + Sao.Tab.counter++;
            this.name_el = jQuery('<span/>');
        },
        create_tabcontent: function() {
            this.el = jQuery('<div/>', {
                'class': this.class_
            });

            var toolbar = this.create_toolbar().appendTo(this.el);
            this.title = toolbar.find('a.navbar-brand');

            if (this.info_bar) {
                this.el.append(this.info_bar.el);
            }
        },
        set_menu: function(menu) {
            this.menu_def().forEach(function(definition) {
                var icon = definition[0];
                var name = definition[1];
                var func = definition[2];
                var item = jQuery('<li/>', {
                    'role': 'presentation'
                }).appendTo(menu);
                var link = jQuery('<a/>', {
                    'role': 'menuitem',
                    'href': '#',
                    'tabindex': -1
                }).append(jQuery('<span/>', {
                    'class': 'glyphicon ' + icon,
                    'aria-hidden': 'true'
                })).append(' ' + name).appendTo(item);
                if (func) {
                    link.click(function() {
                        this[func]();
                    }.bind(this));
                } else {
                    item.addClass('disabled');
                }
            }.bind(this));
        },
        create_toolbar: function() {
            var toolbar = jQuery(
                    '<nav class="navbar navbar-default toolbar" role="navigation">' +
                    '<div class="container-fluid">' +
                    '<div class="main-navbar-header navbar-header">' +
                    '<div>' +
                    '<div class="dropdown" title="' +
                    Sao.i18n.gettext('Menu') +
                    '" data-toggle="tooltip">' +
                    '<a href="#" class="dropdown-toggle" ' +
                    'data-toggle="dropdown" role="button" ' +
                    'aria-expanded="false">' +
                    '<span class="glyphicon glyphicon-wrench" ' +
                    'aria-hidden="true"></span>' +
                    '</span>' +
                    '<span class="caret"></span>' +
                    '</a>' +
                    '<ul class="dropdown-menu" role="menu">' +
                    '</ul>' +
                    '</div>' +
                    '</div>' +
                    '<a class="navbar-brand" href="#"></a>' +
                    '<button type="button" class="navbar-toggle collapsed" ' +
                    'data-toggle="collapse" ' +
                    'data-target="#navbar-' + this.id + '">' +
                    '<span class="sr-only">' +
                    Sao.i18n.gettext('Toggle navigation') +
                    '</span>' +
                    '<span class="icon-bar"></span>' +
                    '<span class="icon-bar"></span>' +
                    '<span class="icon-bar"></span>' +
                    '</div>' +
                    '<div class="main-navbar-body collapse navbar-collapse" ' +
                    'id="navbar-' + this.id + '">' +
                    '<ul class="nav navbar-nav">' +
                    '</ul>' +
                    '</div>' +
                    '</div>' +
                    '</nav>'
                    );
            var wrapper = jQuery('<div/>', {
                'class': 'nav-wrapper'
            }).append(toolbar);
            this.set_menu(toolbar.find('ul[role*="menu"]'));

            var add_button = function(tool) {
                var item = jQuery('<li/>', {
                    'role': 'presentation',
                    'data-toggle': 'tooltip',
                    'title': tool[2]
                })
                .appendTo(toolbar.find('.navbar-collapse > ul'));
                this.buttons[tool[0]] = jQuery('<a/>', {
                    'role': 'menuitem',
                    'href': '#',
                    'id': tool[0]
                })
                .append(jQuery('<span/>', {
                    'class': 'glyphicon ' + tool[1],
                    'aria-hidden': 'true'
                }))
                .append(jQuery('<span/>', {
                    'class': 'visible-xs'
                }).append(' ' + tool[2]))
                .append(jQuery('<span/>', {
                    'class': 'counter',
                }))
                .appendTo(item);
                if (tool[4]) {
                    this.buttons[tool[0]].click(this[tool[4]].bind(this));
                } else {
                    item.addClass('disabled');
                }
                // TODO tooltip
            };
            this.toolbar_def().forEach(add_button.bind(this));
            var tabs = jQuery('#tabs');
            toolbar.affix({
                'target': tabs.parent(),
                'offset': {
                    'top': function() {
                        return tabs.find('.nav-tabs').height();
                    }
                }
            });
            toolbar.on('affix.bs.affix', function() {
                wrapper.height(toolbar.height());
            });
            toolbar.on('affix-top.bs.affix affix-bottom.bs.affix',
                    function() {
                        wrapper.height('');
                    });
            toolbar.on('affixed.bs.affix', function() {
                Sao.Tab.affix_set_with(toolbar);
            });
            toolbar.on('affixed-top.bs.affix affixed-bottom.bs.affix',
                    function() {
                        Sao.Tab.affix_unset_width(toolbar);
                    });
            return wrapper;
        },
        close: function() {
            var tabs = jQuery('#tabs');
            var tab = tabs.find('#nav-' + this.id);
            var content = tabs.find('#' + this.id);
            tabs.find('a[href="#' + this.id + '"]').tab('show');
            return this._close_allowed().then(function() {
                var next = tab.next();
                if (!next.length) {
                    next = tab.prev();
                }
                tab.remove();
                content.remove();
                Sao.Tab.tabs.splice(Sao.Tab.tabs.indexOf(this), 1);
                if (next) {
                    next.find('a').tab('show');
                }
                tabs.trigger('ready');
            }.bind(this));
        },
        _close_allowed: function() {
            return jQuery.when();
        },
        set_name: function(name) {
            this.name_el.text(name);
        }
    });

    Sao.Tab.affix_set_with = function(toolbar) {
        var width = jQuery(toolbar.parent()).width();
        toolbar.css('width', width);
    };
    Sao.Tab.affix_unset_width = function(toolbar) {
        toolbar.css('width', '');
    };
    jQuery(window).resize(function() {
        jQuery('.toolbar').each(function(i, toolbar) {
            toolbar = jQuery(toolbar);
            toolbar.affix('checkPosition');
            if (toolbar.hasClass('affix')) {
                Sao.Tab.affix_set_with(toolbar);
            } else {
                Sao.Tab.affix_unset_width(toolbar);
            }
        });
    });

    Sao.Tab.counter = 0;
    Sao.Tab.tabs = [];
    Sao.Tab.tabs.close = function(warning) {
        if (warning && Sao.Tab.tabs.length) {
            return Sao.common.sur.run(
                    Sao.i18n.gettext(
                        'The following action requires to close all tabs.\n' +
                        'Do you want to continue?')).then(function() {
                return Sao.Tab.tabs.close(false);
            });
        }
        if (Sao.Tab.tabs.length) {
            var tab = Sao.Tab.tabs[0];
            return tab.close().then(function() {
                if (!~Sao.Tab.tabs.indexOf(tab)) {
                    return Sao.Tab.tabs.close();
                } else {
                    return jQuery.Deferred().reject();
                }
            });
        }
        if (Sao.main_menu_screen) {
            return Sao.main_menu_screen.save_tree_state().then(function() {
                Sao.main_menu_screen = null;
            });
        }
        return jQuery.when();
    };
    Sao.Tab.tabs.get_current = function() {
        var tabs = jQuery('#tabs > ul');
        var i = tabs.find('li').index(tabs.find('li.active'));
        return Sao.Tab.tabs[i];
    };
    Sao.Tab.tabs.close_current = function() {
        var tab = this.get_current();
        tab.close();
    };

    Sao.Tab.create = function(attributes) {
        if (attributes.context === undefined) {
            attributes.context = {};
        }
        var tab;
        if (attributes.model) {
            tab = new Sao.Tab.Form(attributes.model, attributes);
        } else {
            tab = new Sao.Tab.Board(attributes);
        }
        Sao.Tab.add(tab);
    };

    Sao.Tab.add = function(tab) {
        var tabs = jQuery('#tabs');
        var tab_link = jQuery('<a/>', {
            'aria-controls': tab.id,
            'role': 'tab',
            'data-toggle': 'tab',
            'href': '#' + tab.id
        })
        .append(jQuery('<button/>', {
            'class': 'close'
        }).append(jQuery('<span/>', {
            'aria-hidden': true
        }).append('&times;')).append(jQuery('<span/>', {
            'class': 'sr-only'
        }).append(Sao.i18n.gettext('Close'))).click(function() {
            tab.close();
        }))
        .append(tab.name_el);
        jQuery('<li/>', {
            'role': 'presentation',
            id: 'nav-' + tab.id
        }).append(tab_link)
        .appendTo(tabs.find('> .nav-tabs'));
        jQuery('<div/>', {
            role: 'tabpanel',
            'class': 'tab-pane',
            id: tab.id
        }).html(tab.el)
        .appendTo(tabs.find('> .tab-content'));
        tab_link.on('shown.bs.tab', function() {
            Sao.View.resize(tab.el);
        });
        tab_link.tab('show');
        tabs.trigger('ready');
    };

    Sao.Tab.Form = Sao.class_(Sao.Tab, {
        class_: 'tab-form',
        init: function(model_name, attributes) {
            Sao.Tab.Form._super.init.call(this);
            var screen = new Sao.Screen(model_name, attributes);
            screen.tab = this;
            this.screen = screen;
            this.attributes = jQuery.extend({}, attributes);

            this.info_bar = new Sao.Window.InfoBar();
            this.create_tabcontent();

            this.set_buttons_sensitive();

            this.view_prm = this.screen.switch_view().done(function() {
                this.set_name(attributes.name ||
                        this.screen.current_view.attributes.string);
                this.el.append(screen.screen_container.el);
                if (attributes.res_id) {
                    if (!jQuery.isArray(attributes.res_id)) {
                        attributes.res_id = [attributes.res_id];
                    }
                    screen.group.load(attributes.res_id);
                    screen.set_current_record(
                        screen.group.get(attributes.res_id));
                    screen.display();
                } else {
                    if (screen.current_view.view_type == 'form') {
                        screen.new_();
                    }
                    if (~['tree', 'graph', 'calendar'].indexOf(
                            screen.current_view.view_type)) {
                        screen.search_filter();
                    }
                }
                this.update_revision();
            }.bind(this));
        },
        toolbar_def: function() {
            return [
                ['new', 'glyphicon-edit',
                Sao.i18n.gettext('New'),
                Sao.i18n.gettext('Create a new record'), 'new_'],
                ['save', 'glyphicon-save',
                Sao.i18n.gettext('Save'),
                Sao.i18n.gettext('Save this record'), 'save'],
                ['switch', 'glyphicon-list-alt',
                Sao.i18n.gettext('Switch'),
                Sao.i18n.gettext('Switch view'), 'switch_'],
                ['reload', 'glyphicon-refresh',
                Sao.i18n.gettext('Reload'),
                Sao.i18n.gettext('Reload'), 'reload'],
                ['previous', 'glyphicon-chevron-left',
                Sao.i18n.gettext('Previous'),
                Sao.i18n.gettext('Previous Record'), 'previous'],
                ['next', 'glyphicon-chevron-right',
                Sao.i18n.gettext('Next'),
                Sao.i18n.gettext('Next Record'), 'next'],
                ['attach', 'glyphicon-paperclip',
                Sao.i18n.gettext('Attachment'),
                Sao.i18n.gettext('Add an attachment to the record'), 'attach'],
                ['note', 'glyphicon-comment',
                Sao.i18n.gettext('Note'),
                Sao.i18n.gettext('Add a note to the record'), 'note']
            ];
        },
        menu_def: function() {
            return [
                ['glyphicon-edit', Sao.i18n.gettext('New'), 'new_'],
                ['glyphicon-save', Sao.i18n.gettext('Save'), 'save'],
                ['glyphicon-list-alt', Sao.i18n.gettext('Switch'), 'switch_'],
                ['glyphicon-refresh', Sao.i18n.gettext('Reload/Undo'),
                    'reload'],
                ['glyphicon-duplicate', Sao.i18n.gettext('Duplicate'), 'copy'],
                ['glyphicon-trash', Sao.i18n.gettext('Delete'), 'delete_'],
                ['glyphicon-chevron-left', Sao.i18n.gettext('Previous'),
                    'previous'],
                ['glyphicon-chevron-right', Sao.i18n.gettext('Next'), 'next'],
                ['glyphicon-search', Sao.i18n.gettext('Search'), 'search'],
                ['glyphicon-time', Sao.i18n.gettext('View Logs...'), 'logs'],
                ['glyphicon-time', Sao.i18n.gettext('Show revisions...'),
                    Sao.common.MODELHISTORY.contains(this.screen.model_name) ?
                        'revision' : null],
                ['glyphicon-remove', Sao.i18n.gettext('Close Tab'), 'close'],
                ['glyphicon-paperclip', Sao.i18n.gettext('Attachment'),
                    'attach'],
                ['glyphicon-comment', Sao.i18n.gettext('Note'), 'note'],
                ['glyphicon-cog', Sao.i18n.gettext('Action'), 'action'],
                ['glyphicon-share-alt', Sao.i18n.gettext('Relate'), 'relate'],
                ['glyphicon-print', Sao.i18n.gettext('Print'), 'print']
            ];
        },
        create_toolbar: function() {
            var toolbar = Sao.Tab.Form._super.create_toolbar.call(this);
            var screen = this.screen;
            var buttons = this.buttons;
            var prm = screen.model.execute('view_toolbar_get', [],
                    screen.context);
            prm.done(function(toolbars) {
                [
                ['action', 'glyphicon-cog',
                    Sao.i18n.gettext('Action'),
                    Sao.i18n.gettext('Launch action')],
                ['relate', 'glyphicon-share-alt',
                     Sao.i18n.gettext('Relate'),
                     Sao.i18n.gettext('Open related records')],
                ['print', 'glyphicon-print',
                     Sao.i18n.gettext('Print'),
                     Sao.i18n.gettext('Print report')]
                ].forEach(function(menu_action) {
                    var button = jQuery('<li/>', {
                        'data-toggle': 'tooltip',
                        'title': menu_action[2],
                        'class': 'dropdown'
                    })
                    .append(jQuery('<a/>', {
                        href: '#',
                        id: menu_action[0],
                        'class': 'dropdown-toggle',
                        'data-toggle': 'dropdown',
                        role: 'button',
                        'aria-expanded': 'false'
                    })
                        .append(jQuery('<span/>', {
                            'class': 'glyphicon ' + menu_action[1],
                            'aria-hidden': 'true'
                        }))
                        .append(jQuery('<span/>', {
                            'class': 'visible-xs'
                        }).append(' ' + menu_action[2] + ' '))
                        .append(jQuery('<span/>', {
                            'class': 'caret'
                        })))
                    .append(jQuery('<ul/>', {
                        'class': 'dropdown-menu',
                        role: 'menu',
                        'aria-labelledby': menu_action[0]
                    }))
                    .appendTo(toolbar.find('.navbar-collapse > ul'));
                    buttons[menu_action[0]] = button;
                    var menu = button.find('ul[role*="menu"]');
                    if (menu_action[0] == 'action') {
                        button.find('a').click(function() {
                            menu.find('.action_button').remove();
                            var buttons = screen.get_buttons();
                            buttons.forEach(function(button) {
                                var item = jQuery('<li/>', {
                                    'role': 'presentation',
                                    'class': 'action_button'
                                })
                                .append(
                                    jQuery('<a/>', {
                                        'role': 'menuitem',
                                        'href': '#',
                                        'tabindex': -1
                                    }).append(
                                        button.attributes.string || ''))
                                .click(function() {
                                    screen.button(button.attributes);
                                })
                            .appendTo(menu);
                            });
                        });
                    }

                    toolbars[menu_action[0]].forEach(function(action) {
                        var item = jQuery('<li/>', {
                            'role': 'presentation'
                        })
                        .append(jQuery('<a/>', {
                            'role': 'menuitem',
                            'href': '#',
                            'tabindex': -1
                        }).append(action.name))
                        .click(function() {
                            screen.save_current().then(function() {
                                var exec_action = jQuery.extend({}, action);
                                var record_id = null;
                                if (screen.current_record) {
                                    record_id = screen.current_record.id;
                                }
                                var record_ids = screen.current_view
                                .selected_records().map(function(record) {
                                    return record.id;
                                });
                                exec_action = Sao.Action.evaluate(exec_action,
                                    menu_action[0], screen.current_record);
                                var data = {
                                    model: screen.model_name,
                                    id: record_id,
                                    ids: record_ids
                                };
                                Sao.Action.exec_action(exec_action, data,
                                    screen.context);
                            });
                        })
                        .appendTo(menu);
                    });
                });
            });
            return toolbar;
        },
        _close_allowed: function() {
            return this.modified_save();
        },
        modified_save: function() {
            this.screen.save_tree_state();
            this.screen.current_view.set_value();
            if (this.screen.modified()) {
                return Sao.common.sur_3b.run(
                        Sao.i18n.gettext('This record has been modified\n' +
                            'do you want to save it?'))
                    .then(function(result) {
                        switch(result) {
                            case 'ok':
                                return this.save();
                            case 'ko':
                                return this.reload(false);
                            default:
                                return jQuery.Deferred().reject();
                        }
                    }.bind(this));
            }
            return jQuery.when();
        },
        new_: function() {
            if (!Sao.common.MODELACCESS.get(this.screen.model_name).create) {
                return;
            }
            this.modified_save().done(function() {
                this.screen.new_().then(function() {
                    this.info_bar.message();
                }.bind(this));
                // TODO activate_save
            }.bind(this));
        },
        save: function() {
            var access = Sao.common.MODELACCESS.get(this.screen.model_name);
            if (!(access.write || access.create)) {
                return jQuery.when();
            }
            return this.screen.save_current().then(
                    function() {
                        this.info_bar.message(
                                Sao.i18n.gettext('Record saved.'), 'info');
                    }.bind(this),
                    function() {
                        this.info_bar.message(
                            this.screen.invalid_message(), 'danger');
                    }.bind(this));
        },
        switch_: function() {
            this.modified_save().done(function() {
                this.screen.switch_view();
            }.bind(this));
        },
        reload: function(test_modified) {
            if (test_modified === undefined) {
                test_modified = true;
            }
            var reload = function() {
                return this.screen.cancel_current().then(function() {
                    this.screen.save_tree_state(false);
                    if (this.screen.current_view.view_type != 'form') {
                        this.screen.search_filter(
                            this.screen.screen_container.search_entry.val());
                        // TODO set current_record
                    }
                    return this.screen.display().then(function() {
                        this.info_bar.message();
                    }.bind(this));
                    // TODO activate_save
                }.bind(this));
            }.bind(this);
            if (test_modified) {
                return this.modified_save().then(reload);
            } else {
                return reload();
            }
        },
        copy: function() {
            if (!Sao.common.MODELACCESS.get(this.screen.model_name).create) {
                return;
            }
            this.modified_save().done(function() {
                this.screen.copy().then(function() {
                    this.info_bar.message(
                            Sao.i18n.gettext(
                                'Working now on the duplicated record(s).'),
                            'info');
                }.bind(this));
            }.bind(this));
        },
        delete_: function() {
            if (!Sao.common.MODELACCESS.get(this.screen.model_name)['delete']) {
                return;
            }
            var msg;
            if (this.screen.current_view.view_type == 'form') {
                msg = Sao.i18n.gettext('Are you sure to remove this record?');
            } else {
                msg = Sao.i18n.gettext('Are you sure to remove those records?');
            }
            Sao.common.sur.run(msg).done(function() {
                this.screen.remove(true, false, true).then(
                        function() {
                            this.info_bar.message(
                                    Sao.i18n.gettext('Records removed.'),
                                    'info');
                            Sao.Tab.tabs.close_current();
                        }.bind(this), function() {
                            this.info_bar.message(
                                    Sao.i18n.gettext('Records not removed.'),
                                    'danger');
                        }.bind(this));
            }.bind(this));
        },
        previous: function() {
            this.modified_save().done(function() {
                this.screen.display_previous();
                this.info_bar.message();
                // TODO activate_save
            }.bind(this));
        },
        next: function() {
            this.modified_save().done(function() {
                this.screen.display_next();
                this.info_bar.message();
                // TODO activate_save
            }.bind(this));
        },
        search: function() {
            var search_entry = this.screen.screen_container.search_entry;
            if (search_entry.is(':visible')) {
                window.setTimeout(function() {
                    search_entry.focus();
                }, 0);
            }
        },
        logs: function() {
            var record = this.screen.current_record;
            if ((!record) || (record.id < 0)) {
                this.info_bar.message(
                        Sao.i18n.gettext('You have to select one record.'),
                        'info');
                return;
            }
            var fields = [
                ['id', Sao.i18n.gettext('ID:')],
                ['create_uid.rec_name',
                    Sao.i18n.gettext('Creation User:')],
                ['create_date', Sao.i18n.gettext('Creation Date:')],
                ['write_uid.rec_name',
                    Sao.i18n.gettext('Latest Modification by:')],
                ['write_date', Sao.i18n.gettext('Latest Modification Date:')]
                ];

            this.screen.model.execute('read', [[record.id],
                    fields.map(function(field) {
                        return field[0];
                    })], this.screen.context)
            .then(function(result) {
                result = result[0];
                var message = '';
                fields.forEach(function(field) {
                    var key = field[0];
                    var label = field[1];
                    var value = result[key] || '/';
                    if (result[key] &&
                        ~['create_date', 'write_date'].indexOf(key)) {
                        value = Sao.common.format_datetime(
                            Sao.common.date_format(),
                            '%H:%M:%S',
                            value);
                    }
                    message += label + ' ' + value + '\n';
                });
                message += Sao.i18n.gettext('Model: ') + this.screen.model.name;
                Sao.common.message.run(message);
            }.bind(this));
        },
        revision: function() {
            var current_id = null;
            if (this.screen.current_record) {
                current_id = this.screen.current_record.id;
            }
            var set_revision = function(revisions) {
                return function(revision) {
                    if (revision) {
                        // Add a millisecond as microseconds are truncated
                        revision.add(1, 'milliseconds');
                    }
                    if ((this.screen.current_view.view_type == 'form') &&
                            (revision < revisions[revisions.length - 1][0])) {
                        revision = revisions[revisions.length - 1][0];
                    }
                    if (revision != this.screen.context._datetime) {
                        // Update screen context that will be propagated by
                        // recreating new group
                        this.screen.context._datetime = revision;
                        if (this.screen.current_view.view_type != 'form') {
                            this.screen.search_filter(
                                    this.screen.screen_container
                                    .search_entry.val());
                        } else {
                            // Test if record exist in revisions
                            this.screen.new_group([current_id]);
                        }
                        this.screen.display(true);
                        this.update_revision();
                    }
                }.bind(this);
            }.bind(this);
            this.modified_save().done(function() {
                var ids = this.screen.current_view.selected_records().map(
                    function(record) {
                        return record.id;
                    });
                this.screen.model.execute('history_revisions',
                    [ids], this.screen.context)
                    .then(function(revisions) {
                        new Sao.Window.Revision(revisions, set_revision(revisions));
                    });
            }.bind(this));
        },
        update_revision: function() {
            var revision = this.screen.context._datetime;
            var label;
            if (revision) {
                var date_format = Sao.common.date_format();
                var time_format = '%H:%M:%S.%f';
                revision = Sao.common.format_datetime(date_format, time_format,
                        revision);
                label = this.name_el.text() + ' @ '+ revision;
            } else {
                label = this.name_el.text();
            }
            this.title.html(label);
            this.set_buttons_sensitive(revision);
        },
        set_buttons_sensitive: function(revision) {
            if (!revision) {
                var access = Sao.common.MODELACCESS.get(this.screen.model_name);
                [['new', access.create],
                ['save', access.create || access.write]
                ].forEach(function(e) {
                    var button = e[0];
                    var access = e[1];
                    if (access) {
                        this.buttons[button].parent().removeClass('disabled');
                    } else {
                        this.buttons[button].parent().addClass('disabled');
                    }
                }.bind(this));
            } else {
                ['new', 'save'].forEach(function(button) {
                    this.buttons[button].parent().addClass('disabled');
                }.bind(this));
            }
        },
        attach: function() {
            var record = this.screen.current_record;
            if (!record || (record.id < 0)) {
                return;
            }
            new Sao.Window.Attachment(record, function() {
                this.update_attachment_count(true);
            }.bind(this));
        },
        update_attachment_count: function(reload) {
            var record = this.screen.current_record;
            if (record) {
                record.get_attachment_count(reload).always(
                        this.attachment_count.bind(this));
            } else {
                this.attachment_count(0);
            }
        },
        attachment_count: function(count) {
            var label = Sao.i18n.gettext(' (%1)', count);
            var counter = this.buttons.attach.find('.counter');
            counter.text(label);
            counter.show();
            var record_id = this.screen.get_id();
            this.buttons.attach.prop('disabled',
                record_id < 0 || record_id === null);
        },
        note: function() {
            var record = this.screen.current_record;
            if (!record || (record.id < 0)) {
                return;
            }
            new Sao.Window.Note(record, function() {
                this.update_unread_note(true);
            }.bind(this));
        },
        update_unread_note: function(reload) {
            var record = this.screen.current_record;
            if (record) {
                record.get_unread_note(reload).always(
                        this._unread_note.bind(this));
            } else {
                this._unread_note(0);
            }
        },
        _unread_note: function(unread) {
            var label = Sao.i18n.gettext(' (%1)', unread);
            var counter = this.buttons.note.find('.counter');
            counter.text(label);
            counter.show();
            var record_id = this.screen.get_id();
            this.buttons.note.prop('disabled',
                    record_id < 0 || record_id === null);
        },
        record_message: function() {
            this.info_bar.message();
        },
        action: function() {
            window.setTimeout(function() {
                this.buttons.action.find('ul.dropdown-menu')
                    .dropdown('toggle');
            }.bind(this));
        },
        relate: function() {
            window.setTimeout(function() {
                this.buttons.relate.find('ul.dropdown-menu')
                    .dropdown('toggle');
            }.bind(this));
        },
        print: function() {
            window.setTimeout(function() {
                this.buttons.print.find('ul.dropdown-menu')
                    .dropdown('toggle');
            }.bind(this));
        }
    });

    Sao.Tab.Board = Sao.class_(Sao.Tab, {
        class_: 'tab-board',
        init: function(attributes) {
            var UIView, view_prm;
            Sao.Tab.Board._super.init.call(this);
            this.model = attributes.model;
            this.view_id = (attributes.view_ids.length > 0 ?
                    attributes.view_ids[0] : null);
            this.context = attributes.context;
            this.name = attributes.name;
            this.dialogs = [];
            this.board = null;
            UIView = new Sao.Model('ir.ui.view');
            view_prm = UIView.execute('read', [[this.view_id], ['arch']],
                    this.context);
            view_prm.done(function(views) {
                var view, board;
                view = jQuery(jQuery.parseXML(views[0].arch));
                this.board = new Sao.View.Board(view, this.context);
                this.board.actions_prms.done(function() {
                    var i, len, action;
                    for (i = 0, len = this.board.actions.length; i < len; i++) {
                        action = this.board.actions[i];
                        action.screen.tab = this;
                    }
                }.bind(this));
                this.el.append(this.board.el);
            }.bind(this));
            this.create_tabcontent();
            this.set_name(this.name);
            this.title.html(this.name_el.text());
        },
        toolbar_def: function() {
            return [
                ['reload', 'glyphicon-refresh',
                Sao.i18n.gettext('Reload'),
                Sao.i18n.gettext('Reload'), 'reload']
            ];
        },
        menu_def: function() {
            return [
                ['glyphicon-refresh', Sao.i18n.gettext('Reload/Undo'), 'reload']
            ];
        },
        reload: function() {
            this.board.reload();
        },
        record_message: function() {
            var i, len;
            var action;

            len = this.board.actions.length;
            for (i = 0, len=len; i < len; i++) {
                action = this.board.actions[i];
                action.update_domain(this.board.actions);
            }
        },
        attachment_count: function() {
        },
        note: function() {
        },
        update_unread_note: function() {
        }
    });

    Sao.Tab.Wizard = Sao.class_(Sao.Tab, {
        class_: 'tab-wizard',
        init: function(wizard) {
            Sao.Tab.Wizard._super.init.call(this);
            this.wizard = wizard;
            this.set_name(wizard.name);
            wizard.tab = this;
            this.create_tabcontent();
            this.title.html(this.name_el.text());
            this.el.append(wizard.form);
        },
        create_toolbar: function() {
            return jQuery('<span/>');
        },
        _close_allowed: function() {
            var wizard = this.wizard;
            var prm = jQuery.when();
            if ((wizard.state !== wizard.end_state) &&
                (wizard.end_state in wizard.states)) {
                prm = wizard.response(wizard.end_state);
            }
            var dfd = jQuery.Deferred();
            prm.always(function() {
                if (wizard.state === wizard.end_state) {
                    dfd.resolve();
                } else {
                    dfd.reject();
                }
            });
            return dfd.promise();
        }
    });
}());

/* This file is part of Tryton.  The COPYRIGHT file at the top level of
   this repository contains the full copyright notices and license terms. */
(function() {
    'use strict';

    Sao.ScreenContainer = Sao.class_(Object, {
        init: function(tab_domain) {
            this.alternate_viewport = jQuery('<div/>', {
                'class': 'screen-container scrollable'
            });
            this.alternate_view = false;
            this.search_modal = null;
            this.search_form = null;
            this.last_search_text = '';
            this.tab_domain = tab_domain || [];
            this.el = jQuery('<div/>', {
                'class': 'screen-container'
            });
            this.filter_box = jQuery('<form/>', {
                'class': 'filter-box'
            }).submit(function(e) {
                this.do_search();
                e.preventDefault();
            }.bind(this));
            var search_row = jQuery('<div/>', {
                'class': 'row'
            }).appendTo(this.filter_box);
            this.el.append(this.filter_box);
            this.filter_button = jQuery('<button/>', {
                type: 'button',
                'class': 'btn btn-default'
            }).append(Sao.i18n.gettext('Filters'));
            this.filter_button.click(this.search_box.bind(this));
            this.search_entry = jQuery('<input/>', {
                'class': 'form-control',
                'placeholder': Sao.i18n.gettext('Search')
            });
            this.search_list = jQuery('<datalist/>');
            this.search_list.uniqueId();
            this.search_entry.attr('list', this.search_list.attr('id'));
            this.search_entry.keypress(this.key_press.bind(this));
            this.search_entry.on('input', this.update.bind(this));

            var but_submit = jQuery('<button/>', {
                'type': 'submit',
                'class': 'btn btn-default',
                'aria-label': Sao.i18n.gettext('Search')
            }).append(jQuery('<span/>', {
                'class': 'glyphicon glyphicon-search'
            }));

            this.but_bookmark = jQuery('<button/>', {
                type: 'button',
                'class': 'btn btn-default dropdown-toggle',
                'data-toggle': 'dropdown',
                'aria-expanded': false,
                'aria-label': Sao.i18n.gettext('Bookmarks'),
                'id': 'bookmarks'
            }).append(jQuery('<span/>', {
                'class': 'glyphicon glyphicon-bookmark',
                'aria-hidden': true
            }));
            var dropdown_bookmark = jQuery('<ul/>', {
                'class': 'dropdown-menu',
                'role': 'menu',
                'aria-labelledby': 'bookmarks'
            });
            this.but_bookmark.click(function() {
                dropdown_bookmark.children().remove();
                var bookmarks = this.bookmarks();
                for (var i=0; i < bookmarks.length; i++) {
                    var name = bookmarks[i][1];
                    var domain = bookmarks[i][2];
                    jQuery('<li/>', {
                        'role': 'presentation'
                    })
                    .append(jQuery('<a/>', {
                        'role': 'menuitem',
                        'href': '#',
                        'tabindex': -1
                    }).append(name)
                        .click(domain, this.bookmark_activate.bind(this)))
                    .appendTo(dropdown_bookmark);
                }
            }.bind(this));
            this.but_star = jQuery('<button/>', {
                'class': 'btn btn-default',
                'type': 'button'
            }).append(jQuery('<span/>', {
                'class': 'glyphicon',
                'aria-hidden': true
            })).click(this.star_click.bind(this));
            this.set_star();

            jQuery('<div/>', {
                'class': 'input-group'
            })
            .append(jQuery('<span/>', {
                'class': 'input-group-btn'
            }).append(this.filter_button))
            .append(this.search_entry)
            .append(this.search_list)
            .append(jQuery('<span/>', {
                'class': 'input-group-btn'
            }).append(but_submit)
                    .append(this.but_star)
                    .append(this.but_bookmark)
                    .append(dropdown_bookmark))
            .appendTo(jQuery('<div/>', {
                'class': 'col-md-8'
            }).appendTo(search_row));


            this.but_prev = jQuery('<button/>', {
                type: 'button',
                'class': 'btn btn-default',
                'aria-label': Sao.i18n.gettext('Previous')
            }).append(jQuery('<span/>', {
                'class': 'glyphicon glyphicon-menu-left',
                'aria-hidden': true
            }));
            this.but_prev.click(this.search_prev.bind(this));
            this.but_next = jQuery('<button/>', {
                type: 'button',
                'class': 'btn btn-default',
                'aria-label': Sao.i18n.gettext('Next')
            }).append(jQuery('<span/>', {
                'class': 'glyphicon glyphicon-menu-right',
                'aria-hidden': true
            }));
            this.but_next.click(this.search_next.bind(this));

            jQuery('<div/>', {
                'class': 'btn-group',
                role: 'group',
            })
            .append(this.but_prev)
            .append(this.but_next)
            .appendTo(jQuery('<div/>', {
                'class': 'col-md-4'
            }).appendTo(search_row));

            this.content_box = jQuery('<div/>', {
                'class': 'content-box'
            });

            if (!jQuery.isEmptyObject(this.tab_domain)) {
                this.tab = jQuery('<div/>', {
                    'class': 'tab-domain'
                }).appendTo(this.el);
                var nav = jQuery('<ul/>', {
                    'class': 'nav nav-tabs',
                    role: 'tablist'
                }).appendTo(this.tab);
                var content = jQuery('<div/>', {
                    'class': 'tab-content'
                }).appendTo(this.tab);
                this.tab_domain.forEach(function(tab_domain, i) {
                    var name = tab_domain[0];
                    var page = jQuery('<li/>', {
                        role: 'presentation',
                        id: 'nav-' + i
                    }).append(jQuery('<a/>', {
                        'aria-controls':  i,
                        role: 'tab',
                        'data-toggle': 'tab',
                        'href': '#' + i
                    }).append(name)).appendTo(nav);
                }.bind(this));
                nav.find('a:first').tab('show');
                var self = this;
                nav.find('a').click(function(e) {
                    e.preventDefault();
                    jQuery(this).tab('show');
                    self.do_search();
                });
            } else {
                this.tab = null;
            }
            this.el.append(this.content_box);
        },
        set_text: function(value) {
            this.search_entry.val(value);
            this.bookmark_match();
        },
        update: function() {
            var completions = this.screen.domain_parser().completion(
                    this.get_text());
            this.search_list.children().remove();
            completions.forEach(function(e) {
                jQuery('<option/>', {
                    'value': e.trim()
                }).appendTo(this.search_list);
            }, this);
        },
        set_star: function(star) {
            var glyphicon = this.but_star.children('span.glyphicon');
            if (star) {
                glyphicon.removeClass('glyphicon-star-empty');
                glyphicon.addClass('glyphicon-star');
                this.but_star.attr('aria-label',
                        Sao.i18n.gettext('Remove this bookmark'));
            } else {
                glyphicon.removeClass('glyphicon-star');
                glyphicon.addClass('glyphicon-star-empty');
                this.but_star.attr('aria-label',
                       Sao.i18n.gettext('Bookmark this filter'));
            }
        },
        get_star: function() {
            var glyphicon = this.but_star.children('span.glyphicon');
            return glyphicon.hasClass('glyphicon-star');
        },
        star_click: function() {
            var star = this.get_star();
            var model_name = this.screen.model_name;
            var refresh = function() {
                this.bookmark_match();
                this.but_bookmark.prop('disabled',
                        jQuery.isEmptyObject(this.bookmarks()));
            }.bind(this);
            if (!star) {
                var text = this.get_text();
                if (!text) {
                    return;
                }
                Sao.common.ask.run(Sao.i18n.gettext('Bookmark Name:'))
                    .then(function(name) {
                        if (!name) {
                            return;
                        }
                        var domain = this.screen.domain_parser().parse(text);
                        Sao.common.VIEW_SEARCH.add(model_name, name, domain)
                        .then(function() {
                            refresh();
                        });
                        this.set_text(
                            this.screen.domain_parser().string(domain));
                    }.bind(this));
            } else {
                var id = this.bookmark_match();
                Sao.common.VIEW_SEARCH.remove(model_name, id).then(function() {
                    refresh();
                });
            }
        },
        bookmarks: function() {
            var searches = Sao.common.VIEW_SEARCH.get(this.screen.model_name);
            return searches.filter(function(search) {
                return this.screen.domain_parser().stringable(search[2]);
            }.bind(this));
        },
        bookmark_activate: function(e) {
            var domain = e.data;
            this.set_text(this.screen.domain_parser().string(domain));
            this.do_search();
        },
        bookmark_match: function() {
            var current_text = this.get_text();
            var current_domain = this.screen.domain_parser().parse(current_text);
            this.but_star.prop('disabled', !current_text);
            var star = this.get_star();
            var bookmarks = this.bookmarks();
            for (var i=0; i < bookmarks.length; i++) {
                var id = bookmarks[i][0];
                var name = bookmarks[i][1];
                var domain = bookmarks[i][2];
                var text = this.screen.domain_parser().string(domain);
                if ((text === current_text) ||
                        (Sao.common.compare(domain, current_domain))) {
                    this.set_star(true);
                    return id;
                }
            }
            this.set_star(false);
        },
        search_prev: function() {
            this.screen.search_prev(this.get_text());
        },
        search_next: function() {
            this.screen.search_next(this.get_text());
        },
        get_tab_domain: function() {
            if (!this.tab) {
                return [];
            }
            var i = this.tab.find('li').index(this.tab.find('li.active'));
            return this.tab_domain[i][1];
        },
        do_search: function() {
            return this.screen.search_filter(this.get_text());
        },
        key_press: function(e) {
            // Wait the current event finished
            window.setTimeout(function() {
                this.bookmark_match();
            }.bind(this));
        },
        set_screen: function(screen) {
            this.screen = screen;
            this.but_bookmark.prop('disabled',
                    jQuery.isEmptyObject(this.bookmarks()));
            this.bookmark_match();
        },
        show_filter: function() {
            this.filter_box.show();
            if (this.tab) {
                this.tab.show();
            }
        },
        hide_filter: function() {
            this.filter_box.hide();
            if (this.tab) {
                this.tab.hide();
            }
        },
        set: function(widget) {
            if (this.alternate_view) {
                this.alternate_viewport.children().detach();
                this.alternate_viewport.append(widget);
            } else {
                this.content_box.children().detach();
                this.content_box.append(widget);
            }
        },
        get_text: function() {
            return this.search_entry.val();
        },
        search_box: function() {
            var domain_parser = this.screen.domain_parser();
            var search = function() {
                this.search_modal.modal('hide');
                var text = '';
                var quote = domain_parser.quote.bind(domain_parser);
                for (var i = 0; i < this.search_form.fields.length; i++) {
                    var label = this.search_form.fields[i][0];
                    var entry = this.search_form.fields[i][1];
                    var value;
                    switch(entry.type) {
                        case 'selection':
                        case 'date':
                        case 'datetime':
                        case 'time':
                            value = entry.get_value(quote);
                            break;
                        default:
                        value = quote(entry.val());
                    }
                    if (value) {
                        text += quote(label) + ': ' + value + ' ';
                    }
                }
                this.set_text(text);
                this.do_search().then(function() {
                    this.last_search_text = this.get_text();
                }.bind(this));
            }.bind(this);
            if (!this.search_modal) {
                var dialog = new Sao.Dialog(
                        Sao.i18n.gettext('Filters'), '', 'lg');
                this.search_modal = dialog.modal;
                this.search_form = dialog.content;
                this.search_form.addClass('form-horizontal');
                this.search_form.submit(function(e) {
                    search();
                    e.preventDefault();
                });

                var fields = [];
                var field;
                for (var f in domain_parser.fields) {
                    field = domain_parser.fields[f];
                    if (field.searchable || field.searchable === undefined) {
                        fields.push(field);
                    }
                }

                var boolean_option = function(input) {
                    return function(e) {
                        jQuery('<option/>', {
                            value: e,
                            text: e
                        }).appendTo(input);
                    };
                };
                var selection_option = function(input) {
                    return function(s) {
                        jQuery('<option/>', {
                            value: s[1],
                            text: s[1]
                        }).appendTo(input);
                    };
                };

                var prefix = 'filter-' + this.screen.model_name + '-';
                this.search_form.fields = [];
                for (var i = 0; i < fields.length; i++) {
                    field = fields[i];
                    var form_group = jQuery('<div/>', {
                        'class': 'form-group form-group-sm'
                    }).append(jQuery('<label/>', {
                        'class': 'col-sm-4 control-label',
                        'for': prefix + field.name,
                        text: field.string
                    })).appendTo(dialog.body);

                    var input;
                    var entry;
                    switch (field.type) {
                        case 'boolean':
                            entry = input = jQuery('<select/>', {
                                'class': 'form-control input-sm',
                                id: prefix + field.name
                            });
                            ['',
                            Sao.i18n.gettext('True'),
                            Sao.i18n.gettext('False')].forEach(
                                    boolean_option(input));
                            break;
                        case 'selection':
                            entry = new Sao.ScreenContainer.Selection(
                                    field.selection, prefix + field.name);
                            input = entry.el;
                            break;
                        case 'date':
                        case 'datetime':
                        case 'time':
                            var format;
                            var date_format = Sao.common.date_format();
                            if (field.type == 'date') {
                                format = date_format;
                            } else {
                                var time_format = new Sao.PYSON.Decoder({}).decode(
                                        field.format);
                                time_format = Sao.common.moment_format(time_format);
                                if (field.type == 'time') {
                                    format = time_format;
                                } else if (field.type == 'datetime') {
                                    format = date_format + ' ' + time_format;
                                }
                            }
                            entry = new Sao.ScreenContainer.DateTimes(
                                    format, prefix + field.name);
                            input = entry.el;
                            break;
                        default:
                            entry = input = jQuery('<input/>', {
                                'class': 'form-control input-sm',
                                type: 'text',
                                placeholder: field.string,
                                id: prefix + field.name
                            });
                            break;
                    }
                    jQuery('<div/>', {
                        'class': 'col-sm-8'
                    }).append(input).appendTo(form_group);
                    this.search_form.fields.push([field.string, entry]);
                }

                jQuery('<button/>', {
                    'class': 'btn btn-primary',
                    type: 'submit'
                }).append(Sao.i18n.gettext('Find'))
                .click(search).appendTo(dialog.footer);
            }
            this.search_modal.modal('show');
            if (this.last_search_text.trim() !== this.get_text().trim()) {
                for (var j = 0; j < this.search_form.fields.length; j++) {
                    var fentry = this.search_form.fields[j][1];
                    switch(fentry.type) {
                        case 'selection':
                            fentry.set_value([]);
                            break;
                        case 'date':
                        case 'datetime':
                        case 'time':
                            fentry.set_value(null, null);
                            break;
                        default:
                            fentry.val('');
                    }
                }
                this.search_form.fields[0][1].focus();
            }
        }
    });

    Sao.ScreenContainer.DateTimes = Sao.class_(Object, {
        type: 'date',
        init: function(format, id) {
            this.el = jQuery('<div/>', {
                'class': 'row',
                id: id
            });
            var build_entry = function(placeholder) {
                var entry = jQuery('<div/>', {
                    'class': 'input-group input-group-sm'
                });
                jQuery('<input/>', {
                    'class': 'form-control input-sm',
                    type: 'text',
                    placeholder: placeholder,
                    id: id + '-from'
                }).appendTo(entry);
                jQuery('<span/>', {
                    'class': 'input-group-btn'
                }).append(jQuery('<button/>', {
                    'class': 'btn btn-default',
                    type: 'button'
                }).append(jQuery('<span/>', {
                    'class': 'glyphicon glyphicon-calendar'
                }))).appendTo(entry);
                entry.datetimepicker();
                entry.data('DateTimePicker').format(format);
                return entry;
            };
            this.from = build_entry('From').appendTo(jQuery('<div/>', {
                'class': 'col-md-5'
            }).appendTo(this.el));
            jQuery('<p/>', {
                'class': 'text-center'
            }).append('..').appendTo(jQuery('<div/>', {
                'class': 'col-md-1'
            }).appendTo(this.el));
            this.to = build_entry('To').appendTo(jQuery('<div/>', {
                'class': 'col-md-5'
            }).appendTo(this.el));
        },
        _get_value: function(entry) {
            return entry.find('input').val();
        },
        get_value: function(quote) {
            var from = this._get_value(this.from);
            var to = this._get_value(this.to);
            if (from && to) {
                if (from !== to) {
                    return quote(from) + '..' + quote(to);
                } else {
                    return quote(from);
                }
            } else if (from) {
                return '>=' + quote(from);
            } else if (to) {
                return '<=' + quote(to);
            }
        },
        set_value: function(from, to) {
            this.from.data('DateTimePicker').date(from);
            this.to.data('DateTimePicker').date(to);
        }
    });

    Sao.ScreenContainer.Selection = Sao.class_(Object, {
        type: 'selection',
        init: function(selections, id) {
            this.el = jQuery('<select/>', {
                'class': 'form-control input-sm',
                multiple: true,
                id: id
            });
            selections.forEach(function(s) {
                jQuery('<option/>', {
                    value: s[1],
                    text: s[1]
                }).appendTo(this.el);
            }.bind(this));
        },
        get_value: function(quote) {
            var value = this.el.val();
            if (value) {
                value = jQuery.map(value, quote).reduce(function(a, b) {
                    if (a) {a += ';';}
                    return a + b;
                });
            }
            return value;
        },
        set_value: function(value) {
            this.el.val(value);
        }
    });

    Sao.Screen = Sao.class_(Object, {
        init: function(model_name, attributes) {
            this.model_name = model_name;
            this.model = new Sao.Model(model_name, attributes);
            this.attributes = jQuery.extend({}, attributes);
            this.attributes.limit = this.attributes.limit || Sao.config.limit;
            this.view_ids = jQuery.extend([], attributes.view_ids);
            this.view_to_load = jQuery.extend([],
                attributes.mode || ['tree', 'form']);
            this.views = [];
            this.views_preload = attributes.views_preload || {};
            this.exclude_field = attributes.exclude_field;
            this.context = attributes.context || {};
            this.current_view = null;
            this.current_record = null;
            this.new_group();
            this.domain = attributes.domain || [];
            this.size_limit = null;
            this.limit = attributes.limit || Sao.config.limit;
            this.offset = 0;
            var access = Sao.common.MODELACCESS.get(model_name);
            if (!(access.write || access.create)) {
                this.attributes.readonly = true;
            }
            this.search_count = 0;
            this.screen_container = new Sao.ScreenContainer(
                attributes.tab_domain);

            this.context_screen = null;
            if (attributes.context_model) {
                this.context_screen = new Sao.Screen(
                        attributes.context_model, {
                            'mode': ['form'],
                            'context': attributes.context });

                this.context_screen_prm = this.context_screen.switch_view()
                    .then(function() {
                        jQuery('<div/>', {
                            'class': 'row'
                        }).append(jQuery('<div/>', {
                            'class': 'col-md-12'
                        }).append(this.context_screen.screen_container.el))
                        .prependTo(this.screen_container.filter_box);
                        return this.context_screen.new_(false).then(function(record) {
                            // Set manually default to get context_screen_prm
                            // resolved when default is set.
                            return record.default_get();
                        });
                    }.bind(this));
            }

            if (!attributes.row_activate) {
                this.row_activate = this.default_row_activate;
            } else {
                this.row_activate = attributes.row_activate;
            }
            this.tree_states = {};
            this.tree_states_done = [];
            this.fields_view_tree = {};
            this._domain_parser = {};
            this.pre_validate = false;
            this.tab = null;
            // [Coog specific] used for group_sync
            this.parent = null;
        },
        load_next_view: function() {
            if (!jQuery.isEmptyObject(this.view_to_load)) {
                var view_id;
                if (!jQuery.isEmptyObject(this.view_ids)) {
                    view_id = this.view_ids.shift();
                }
                var view_type = this.view_to_load.shift();
                return this.add_view_id(view_id, view_type);
            }
            return jQuery.when();
        },
        add_view_id: function(view_id, view_type) {
            var view;
            if (view_id && this.views_preload[String(view_id)]) {
                view = this.views_preload[String(view_id)];
            } else if (!view_id && this.views_preload[view_type]) {
                view = this.views_preload[view_type];
            } else {
                var prm = this.model.execute('fields_view_get',
                        [view_id, view_type], this.context);
                return prm.pipe(this.add_view.bind(this));
            }
            this.add_view(view);
            return jQuery.when();
        },
        add_view: function(view) {
            var arch = view.arch;
            var fields = view.fields;
            var view_id = view.view_id;
            var xml_view = jQuery(jQuery.parseXML(arch));

            if (xml_view.children().prop('tagName') == 'tree') {
                this.fields_view_tree[view_id] = view;
            }

            var loading = 'eager';
            if (xml_view.children().prop('tagName') == 'form') {
                loading = 'lazy';
            }
            for (var field in fields) {
                if (!(field in this.model.fields) || loading == 'eager') {
                    fields[field].loading = loading;
                } else {
                    fields[field].loading = this.model.fields[field]
                        .description.loading;
                }
            }
            this.model.add_fields(fields);
            var view_widget = Sao.View.parse(this, xml_view, view.field_childs,
                view.children_definitions);
            view_widget.view_id = view_id;
            this.views.push(view_widget);

            return view_widget;
        },
        number_of_views: function() {
            return this.views.length + this.view_to_load.length;
        },
        switch_view: function(view_type) {
            if (this.current_view) {
                this.current_view.set_value();
                if (this.current_record &&
                        !~this.current_record.group.indexOf(
                            this.current_record)) {
                    this.current_record = null;
                }
                var fields = this.current_view.get_fields();
                if (this.current_record && this.current_view.editable &&
                        !this.current_record.validate(
                            fields, false, false, true)) {
                    this.screen_container.set(this.current_view.el);
                    return this.current_view.display().done(function() {
                        this.set_cursor();
                    }.bind(this));
                }
            }
            var _switch = function() {
                if ((!view_type) || (!this.current_view) ||
                        (this.current_view.view_type != view_type)) {
                    var switch_current_view = (function() {
                        this.current_view = this.views[this.views.length - 1];
                        return _switch();
                    }.bind(this));
                    for (var i = 0; i < this.number_of_views(); i++) {
                        if (this.view_to_load.length) {
                            if (!view_type) {
                                view_type = this.view_to_load[0];
                            }
                            return this.load_next_view().then(
                                    switch_current_view);
                        }
                        this.current_view = this.views[
                            (this.views.indexOf(this.current_view) + 1) %
                            this.views.length];
                        if (!view_type) {
                            break;
                        } else if (this.current_view.view_type == view_type) {
                            break;
                        }
                    }
                }
                this.screen_container.set(this.current_view.el);
                return this.display().done(function() {
                    this.set_cursor();
                }.bind(this));
            }.bind(this);
            return _switch();
        },
        search_filter: function(search_string) {
            if (this.context_screen) {
                if (this.context_screen_prm.state() == 'pending') {
                    return this.context_screen_prm.then(function() {
                        return this.search_filter(search_string);
                    }.bind(this));
                }
                var context_record = this.context_screen.current_record;
                if (context_record &&
                        !context_record.validate(null, false, null, true)) {
                    this.new_group([]);
                    this.context_screen.display(true);
                    return jQuery.when();
                }
                this.context = jQuery.extend({}, this.context,
                        this.context_screen.get_on_change_value());
            }

            var domain = [];
            var domain_parser = this.domain_parser();

            if (domain_parser && !this.group.parent) {
                if (search_string || search_string === '') {
                    domain = domain_parser.parse(search_string);
                } else {
                    domain = this.attributes.search_value;
                }
                this.screen_container.set_text(
                        domain_parser.string(domain));
            } else {
                domain = [['id', 'in', this.group.map(function(r) {
                    return r.id;
                })]];
            }

            if (!jQuery.isEmptyObject(domain)) {
                if (!jQuery.isEmptyObject(this.attributes.domain)) {
                    domain = ['AND', domain, this.attributes.domain];
                }
            } else {
                domain = this.attributes.domain || [];
            }

            var tab_domain = this.screen_container.get_tab_domain();
            if (!jQuery.isEmptyObject(tab_domain)) {
                domain = ['AND', domain, tab_domain];
            }

            var grp_prm = this.model.find(domain, this.offset, this.limit,
                    this.attributes.order, this.context);
            var count_prm = this.model.execute('search_count', [domain],
                    this.context);
            count_prm.done(function(count) {
                this.search_count = count;
            }.bind(this));
            grp_prm.done(this.set_group.bind(this));
            grp_prm.done(this.display.bind(this));
            jQuery.when(grp_prm, count_prm).done(function(group, count) {
                this.screen_container.but_next.prop('disabled',
                        !(group.length == this.limit &&
                            count > this.limit + this.offset));
            }.bind(this));
            this.screen_container.but_prev.prop('disabled', this.offset <= 0);
            return grp_prm;
        },
        set_group: function(group) {
            if (this.group) {
                jQuery.extend(group.model.fields, this.group.model.fields);
                this.group.screens.splice(
                        this.group.screens.indexOf(this), 1);
                jQuery.extend(group.on_write, this.group.on_write);
                group.on_write = group.on_write.filter(function(e, i, a) {
                    return i == a.indexOf(e);
                });
                if (this.group.parent && !group.parent) {
                    group.parent = this.group.parent;
                }
            }
            group.screens.push(this);
            this.tree_states_done = [];
            this.group = group;
            this.model = group.model;
            if (jQuery.isEmptyObject(group)) {
                this.set_current_record(null);
            } else {
                this.set_current_record(group[0]);
            }
        },
        new_group: function(ids) {
            var group = new Sao.Group(this.model, this.context, []);
            group.set_readonly(this.attributes.readonly || false);
            if (ids) {
                group.load(ids);
            }
            this.set_group(group);
        },
        set_current_record: function(record) {
            var changed = this.current_record !== record;
            this.current_record = record;
            // TODO position
            if (this.tab) {
                if (record) {
                    record.get_attachment_count().always(
                            this.tab.attachment_count.bind(this.tab));
                    record.get_unread_note().always(
                            this.tab.update_unread_note.bind(this.tab));
                } else {
                    this.tab.attachment_count(0);
                    this.tab.update_unread_note(0);
                }
                this.tab.record_message();
            }
            // [Coog specific] multi_mixed_view
            if (this.parent && changed){
                this.parent.group_sync(this, this.current_record);
            }
        },
        display: function(set_cursor) {
            var deferreds = [];
            if (this.current_record &&
                    ~this.current_record.group.indexOf(this.current_record)) {
            } else if (!jQuery.isEmptyObject(this.group) &&
                    (this.current_view.view_type != 'calendar')) {
                this.current_record = this.group[0];
            } else {
                this.current_record = null;
            }
            if (this.views) {
                var search_prm = this.search_active(
                        ~['tree', 'graph', 'calendar'].indexOf(
                            this.current_view.view_type));
                deferreds.push(search_prm);
                for (var i = 0; i < this.views.length; i++) {
                    if (this.views[i]) {
                        deferreds.push(this.views[i].display());
                    }
                }
            }
            return jQuery.when.apply(jQuery, deferreds).then(function() {
                this.set_tree_state();
                this.set_current_record(this.current_record);
                // set_cursor must be called after set_tree_state because
                // set_tree_state redraws the tree
                if (set_cursor) {
                    this.set_cursor(false, false);
                }
            }.bind(this));
        },
        display_next: function() {
            var view = this.current_view;
            view.set_value();
            this.set_cursor(false, false);
            if (~['tree', 'form'].indexOf(view.view_type) &&
                    this.current_record && this.current_record.group) {
                var group = this.current_record.group;
                var record = this.current_record;
                while (group) {
                    var index = group.indexOf(record);
                    if (index < group.length - 1) {
                        record = group[index + 1];
                        break;
                    } else if (group.parent &&
                            (record.group.model_name ==
                             group.parent.group.model_name)) {
                        record = group.parent;
                        group = group.parent.group;
                    } else {
                        break;
                    }
                }
                this.set_current_record(record);
            } else {
                this.set_current_record(this.group[0]);
            }
            this.set_cursor(false, false);
            view.display();
        },
        display_previous: function() {
            var view = this.current_view;
            view.set_value();
            this.set_cursor(false, false);
            if (~['tree', 'form'].indexOf(view.view_type) &&
                    this.current_record && this.current_record.group) {
                var group = this.current_record.group;
                var record = this.current_record;
                while (group) {
                    var index = group.indexOf(record);
                    if (index > 0) {
                        record = group[index - 1];
                        break;
                    } else if (group.parent &&
                            (record.group.model_name ==
                             group.parent.group.model_name)) {
                        record = group.parent;
                        group = group.parent.group;
                    } else {
                        break;
                    }
                }
                this.set_current_record(record);
            } else {
                this.set_current_record(this.group[0]);
            }
            this.set_cursor(false, false);
            view.display();
        },
        default_row_activate: function() {
            if ((this.current_view.view_type == 'tree') &&
                    (this.current_view.attributes.keyword_open == 1)) {
                Sao.Action.exec_keyword('tree_open', {
                    'model': this.model_name,
                    'id': this.get_id(),
                    'ids': [this.get_id()]
                    }, jQuery.extend({}, this.context), false);
            } else {
                if (!this.modified()) {
                    this.switch_view('form');
                }
            }
        },
        get_id: function() {
            if (this.current_record) {
                return this.current_record.id;
            }
        },
        new_: function(default_) {
            if (default_ === undefined) {
                default_ = true;
            }
            var prm = jQuery.when();
            if (this.current_view &&
                    ((this.current_view.view_type == 'tree' &&
                      !this.current_view.editable) ||
                     this.current_view.view_type == 'graph')) {
                prm = this.switch_view('form');
            }
            return prm.then(function() {
                var group;
                if (this.current_record) {
                    group = this.current_record.group;
                } else {
                    group = this.group;
                }
                var record = group.new_(default_);
                group.add(record, this.new_model_position());
                this.set_current_record(record);
                return this.display().then(function() {
                    this.set_cursor(true, true);
                    return record;
                }.bind(this));
            }.bind(this));
        },
        new_model_position: function() {
            var position = -1;
            if (this.current_view && (this.current_view.view_type == 'tree') &&
                    (this.current_view.attributes.editable == 'top')) {
                position = 0;
            }
            return position;
        },
        set_on_write: function(name) {
            if(name) {
                if (!~this.group.on_write.indexOf(name)) {
                    this.group.on_write.push(name);
                }
            }
        },
        cancel_current: function() {
            var prms = [];
            if (this.current_record) {
                this.current_record.cancel();
                if (this.current_record.id < 0) {
                    prms.push(this.remove());
                }
            }
            return jQuery.when.apply(jQuery, prms);
        },
        save_current: function() {
            var current_record = this.current_record;
            if (!current_record) {
                if ((this.current_view.view_type == 'tree') &&
                        (!jQuery.isEmptyObject(this.group))) {
                    this.set_current_record(this.group[0]);
                } else {
                    return jQuery.when();
                }
            }
            this.current_view.set_value();
            var fields = this.current_view.get_fields();
            var path = current_record.get_path(this.group);
            var prm = jQuery.Deferred();
            if (this.current_view.view_type == 'tree') {
                prm = this.group.save();
            } else {
                current_record.validate(fields).then(function(validate) {
                    if (validate) {
                        current_record.save().then(
                            prm.resolve, prm.reject);
                    } else {
                        this.current_view.display().done(
                                this.set_cursor.bind(this));
                        prm.reject();
                    }
                }.bind(this));
            }
            var dfd = jQuery.Deferred();
            prm = prm.then(function() {
                if (path && current_record.id) {
                    path.splice(-1, 1,
                            [path[path.length - 1][0], current_record.id]);
                }
                return this.group.get_by_path(path).then(function(record) {
                    this.set_current_record(record);
                }.bind(this));
            }.bind(this));
            prm.then(function() {
                this.display().always(dfd.resolve);
            }.bind(this), function() {
                this.display().always(dfd.reject);
            }.bind(this));
            return dfd.promise();
        },
        set_cursor: function(new_, reset_view) {
            if (!this.current_view) {
                return;
            } else if (~['tree', 'form'].indexOf(this.current_view.view_type)) {
                this.current_view.set_cursor(new_, reset_view);
            }
        },
        modified: function() {
            var test = function(record) {
                return (record.has_changed() || record.id < 0);
            };
            if (this.current_view.view_type != 'tree') {
                if (this.current_record) {
                    if (test(this.current_record)) {
                        return true;
                    }
                }
            } else {
                if (this.group.some(test)) {
                    return true;
                }
            }
            // TODO test view modified
            return false;
        },
        unremove: function() {
            var records = this.current_view.selected_records();
            records.forEach(function(record) {
                record.group.unremove(record);
            });
        },
        remove: function(delete_, remove, force_remove) {
            var records = null;
            if ((this.current_view.view_type == 'form') &&
                    this.current_record) {
                records = [this.current_record];
            } else if (this.current_view.view_type == 'tree') {
                records = this.current_view.selected_records();
            }
            if (jQuery.isEmptyObject(records)) {
                return;
            }
            var prm = jQuery.when();
            if (delete_) {
                // TODO delete children before parent
                prm = this.model.delete_(records);
            }
            var top_record = records[0];
            var top_group = top_record.group;
            var idx = top_group.indexOf(top_record);
            var path = top_record.get_path(this.group);
            return prm.then(function() {
                records.forEach(function(record) {
                    record.group.remove(record, remove, true, force_remove, false);
                });
                var prms = [];
                if (delete_) {
                    records.forEach(function(record) {
                        if (record.group.parent) {
                            prms.push(record.group.parent.save(false));
                        }
                        if (~record.group.record_deleted.indexOf(record)) {
                            record.group.record_deleted.splice(
                                record.group.record_deleted.indexOf(record), 1);
                        }
                        if (~record.group.record_removed.indexOf(record)) {
                            record.group.record_removed.splice(
                                record.group.record_removed.indexOf(record), 1);
                        }
                        // TODO destroy
                    });
                }
                if (idx > 0) {
                    var record = top_group[idx - 1];
                    path.splice(-1, 1, [path[path.length - 1][0], record.id]);
                } else {
                    path.splice(-1, 1);
                }
                if (!jQuery.isEmptyObject(path)) {
                    prms.push(this.group.get_by_path(path).then(function(record) {
                        this.set_current_record(record);
                    }.bind(this)));
                } else if (this.group.length) {
                    this.set_current_record(this.group[0]);
                }

                return jQuery.when.apply(jQuery, prms).then(function() {
                    this.display().done(function() {
                        this.set_cursor();
                    }.bind(this));
                }.bind(this));
            }.bind(this));
        },
        copy: function() {
            var dfd = jQuery.Deferred();
            var records = this.current_view.selected_records();
            this.model.copy(records, this.context).then(function(new_ids) {
                this.group.load(new_ids);
                if (!jQuery.isEmptyObject(new_ids)) {
                    this.set_current_record(this.group.get(new_ids[0]));
                }
                this.display().always(dfd.resolve);
            }.bind(this), dfd.reject);
            return dfd.promise();
        },
        search_active: function(active) {
            if (active && !this.group.parent) {
                this.screen_container.set_screen(this);
                this.screen_container.show_filter();
            } else {
                this.screen_container.hide_filter();
            }
            return jQuery.when();
        },
        domain_parser: function() {
            var view_id, view_tree;
            if (this.current_view) {
                view_id = this.current_view.view_id;
            } else {
                view_id = null;
            }
            if (view_id in this._domain_parser) {
                return this._domain_parser[view_id];
            }
            if (!(view_id in this.fields_view_tree)) {
                // Fetch default view for the next time
                this.model.execute('fields_view_get', [false, 'tree'],
                        this.context).then(function(view) {
                    this.fields_view_tree[view_id] = view;
                }.bind(this));
                view_tree = {};
                view_tree.fields = {};
            } else {
                view_tree = this.fields_view_tree[view_id];
            }
            var fields = jQuery.extend({}, view_tree.fields);

            var set_selection = function(props) {
                return function(selection) {
                    props.selection = selection;
                };
            };
            for (var name in fields) {
                var props = fields[name];
                if ((props.type != 'selection') &&
                        (props.type != 'reference')) {
                    continue;
                }
                if (props.selection instanceof Array) {
                    continue;
                }
                this.get_selection(props).then(set_selection(props));
            }

            if ('arch' in view_tree) {
                // Filter only fields in XML view
                var xml_view = jQuery(jQuery.parseXML(view_tree.arch));
                var xml_fields = xml_view.find('tree').children()
                    .filter(function(node) {
                        return node.tagName == 'field';
                    }).map(function(node) {
                        return node.getAttribute('name');
                    });
                var dom_fields = {};
                xml_fields.each(function(name) {
                    dom_fields[name] = fields[name];
                });
            }

            // Add common fields
            [
                ['id', Sao.i18n.gettext('ID'), 'integer'],
                ['create_uid', Sao.i18n.gettext('Creation User'),
                    'many2one'],
                ['create_date', Sao.i18n.gettext('Creation Date'),
                    'datetime'],
                ['write_uid', Sao.i18n.gettext('Modification User'),
                     'many2one'],
                ['write_date', Sao.i18n.gettext('Modification Date'),
                     'datetime']
                    ] .forEach(function(e) {
                        var name = e[0];
                        var string = e[1];
                        var type = e[2];
                        if (!(name in fields)) {
                            fields[name] = {
                                'string': string,
                                'name': name,
                                'type': type
                            };
                            if (type == 'datetime') {
                                fields[name].format = '"%H:%M:%S"';
                            }
                        }
                    });
            if (!('id' in fields)) {
                fields.id = {
                    'string': Sao.i18n.gettext('ID'),
                    'name': 'id',
                    'type': 'integer'
                };
            }

            var context = jQuery.extend({},
                    this.model.session.context,
                    this.context);
            var domain_parser = new Sao.common.DomainParser(
                    fields, context);
            this._domain_parser[view_id] = domain_parser;
            return domain_parser;
        },
        get_selection: function(props) {
            var prm;
            var change_with = props.selection_change_with;
            if (!jQuery.isEmptyObject(change_with)) {
                var values = {};
                change_with.forEach(function(p) {
                    values[p] = null;
                });
                prm = this.model.execute(props.selection,
                        [values]);
            } else {
                prm = this.model.execute(props.selection,
                        []);
            }
            return prm.then(function(selection) {
                return selection.sort(function(a, b) {
                    return a[1].localeCompare(b[1]);
                });
            });
        },
        search_prev: function(search_string) {
            this.offset -= this.limit;
            this.search_filter(search_string);
        },
        search_next: function(search_string) {
            this.offset += this.limit;
            this.search_filter(search_string);
        },
        invalid_message: function(record) {
            if (!record) {
                record = this.current_record;
            }
            var fields_desc = {};
            for (var fname in record.model.fields) {
                var field = record.model.fields[fname];
                fields_desc[fname] = field.description;
            }
            var domain_parser = new Sao.common.DomainParser(fields_desc);
            var fields = [];
            var invalid_fields = record.invalid_fields();
            Object.keys(invalid_fields).sort().forEach(
                function(field) {
                    var invalid = invalid_fields[field];
                    var string = record.model.fields[field].description.string;
                    if ((invalid == 'required') ||
                            (Sao.common.compare(invalid,
                                                [[field, '!=', null]]))) {
                        fields.push(Sao.i18n.gettext('"%1" is required', string));
                    } else if (invalid == 'domain') {
                        fields.push(Sao.i18n.gettext(
                                    '"%1" is not valid according to its domain',
                                    string));
                    } else if (invalid == 'children') {
                        fields.push(Sao.i18n.gettext(
                                'The values of "%1" are not valid', string));
                    } else {
                        if (domain_parser.stringable(invalid)) {
                            fields.push(domain_parser.string(invalid));
                        } else {
                            fields.push(Sao.i18n.gettext(
                                    '"%1" is not valid according to its domain'),
                                string);
                        }
                    }
                });
            if (fields.length > 5) {
                fields.splice(5, fields.length);
                fields.push('...');
            }
            return fields.join('\n');
        },
        get: function() {
            if (!this.current_record) {
                return null;
            }
            this.current_view.set_value();
            return this.current_record.get();
        },
        get_on_change_value: function() {
            if (!this.current_record) {
                return null;
            }
            this.current_view.set_value();
            return this.current_record.get_on_change_value();
        },
        reload: function(ids, written, no_display) {
            this.group.reload(ids);
            if (written) {
                this.group.written(ids);
            }
            if (this.group.parent) {
                this.group.parent.root_parent().reload();
            }
            if (!no_display)
                this.display();
        },
        get_buttons: function() {
            var selected_records = this.current_view.selected_records();
            if (jQuery.isEmptyObject(selected_records)) {
                return [];
            }
            var buttons = this.current_view.get_buttons();
            selected_records.forEach(function(record) {
                buttons = buttons.filter(function(button) {
                    if (record.group.get_readonly() || record.readonly()) {
                        return false;
                    }
                    if (button.attributes.type === 'instance') {
                        return false;
                    }
                    var states = record.expr_eval(
                        button.attributes.states || {});
                    return !(states.invisible || states.readonly);
                });
            });
            return buttons;
        },
        button: function(attributes) {
            var ids;
            var process_action = function(action) {
                if (action && typeof action == 'string' &&
                    action.indexOf('delete') > -1)
                    this.reload(ids, true, true);
                else if (action && typeof action != 'string')
                    this.reload(ids, true, true);
                else
                    this.reload(ids, true);
                if (typeof action == 'string') {
                    this.client_action(action);
                }
                else if (action) {
                    Sao.Action.execute(action, {
                        model: this.model_name,
                        id: record.id,
                        ids: ids
                    }, null, this.context);
                }
            };

            var selected_records = this.current_view.selected_records();
            this.current_view.set_value();
            var fields = this.current_view.get_fields();

            var prms = [];
            var reset_state = function(record) {
                return function() {
                    this.display(true);
                    // Reset valid state with normal domain
                    record.validate(fields);
                }.bind(this);
            }.bind(this);
            for (var i = 0; i < selected_records.length; i++) {
                var record = selected_records[i];
                var domain = record.expr_eval(
                    (attributes.states || {})).pre_validate || [];
                prms.push(record.validate(fields, false, domain));
            }
            jQuery.when.apply(jQuery, prms).then(function() {
                var record;
                for (var i = 0; i < selected_records.length; i++) {
                    record = selected_records[i];
                    var result = arguments[i];
                    if (result) {
                        continue;
                    }
                    Sao.common.warning.run(
                            this.invalid_message(record),
                            Sao.i18n.gettext('Pre-validation'))
                        .then(reset_state(record));
                    return;
                }

                // TODO confirm
                record = this.current_record;
                if (attributes.type === 'instance') {
                    var args = record.expr_eval(attributes.change || []);
                    var values = record._get_on_change_args(args);
                    record.model.execute(attributes.name, [values], this.context)
                        .then(function(changes) {
                            record.set_on_change(changes);
                            record.group.root_group().screens.forEach(function(screen) {
                                screen.display();
                            });
                        });
                } else {
                    record.save(false).done(function() {
                        var context = jQuery.extend({}, this.context);
                        context._timestamp = {};
                        ids = [];
                        for (i = 0; i < selected_records.length; i++) {
                            record = selected_records[i];
                            jQuery.extend(context._timestamp, record.get_timestamp());
                            ids.push(record.id);
                        }
                        record.model.execute(attributes.name,
                            [ids], context).then(process_action.bind(this));
                    }.bind(this));
                }
            }.bind(this));
        },
        client_action: function(action) {
            var access = Sao.common.MODELACCESS.get(this.model_name);
            // [Coog specific] Allow multiple actions
            var actions = action.split(',');
            for (var i in actions){
                this.do_single_action(actions[i], access);
            }
        },
        do_single_action: function(action, access) {
            if (action == 'new') {
                if (access.create) {
                    this.new_();
                }
            } else if (action == 'delete') {
                if (access['delete']) {
                    this.remove(!this.group.parent, false, !this.group.parent);
                }
            } else if (action == 'remove') {
                if (access.write && access.read && this.group.parent) {
                    this.remove(false, true, false);
                }
            } else if (action == 'copy') {
                if (access.create) {
                    this.copy();
                }
            } else if (action == 'next') {
                this.display_next();
            } else if (action == 'previous') {
                this.display_previous();
            } else if (action == 'close') {
                // [Bug Sao]
                // TODO: report to tryton
                Sao.Tab.tabs.close_current();
            } else if (action.startsWith('switch')) {
                var view_type = action.split(' ')[1];
                this.switch_view(view_type);
            } else if (action == 'reload') {
                if (~['tree', 'graph', 'calendar'].indexOf(this.current_view.view_type) &&
                        !this.group.parent) {
                    this.search_filter();
                }
            } else if (action == 'reload menu') {
                Sao.get_preferences().then(function(preferences) {
                    Sao.menu(preferences);
                });
            } else if (action == 'reload context') {
                Sao.get_preferences();
            }
        },
        save_tree_state: function(store) {
            var prms = [];
            var prm;
            store = (store === undefined) ? true : store;
            var i, len, view, widgets, wi, wlen;
            var parent_ = this.group.parent ? this.group.parent.id : null;
            var timestamp = this.group.parent ?
                this.group.parent._timestamp : null;
            for (i = 0, len = this.views.length; i < len; i++) {
                view = this.views[i];
                if (view.view_type == 'form') {
                    for (var wid_key in view.widgets) {
                        if (!view.widgets.hasOwnProperty(wid_key)) {
                            continue;
                        }
                        widgets = view.widgets[wid_key];
                        for (wi = 0, wlen = widgets.length; wi < wlen; wi++) {
                            if (widgets[wi].screen) {
                                prm = widgets[wi].screen.save_tree_state(store);
                                prms.push(prm);
                            }
                        }
                    }
                    if ((this.views.length == 1) && this.current_record) {
                        if (!(parent_ in this.tree_states)) {
                            this.tree_states[parent_] = {};
                        }
                        this.tree_states[parent_][
                            view.children_field || null] = [
                            timestamp, [], [[this.current_record.id]]];
                    }
                } else if (view.view_type == 'tree') {
                    var paths = view.get_expanded_paths();
                    var selected_paths = view.get_selected_paths();
                    if (!(parent_ in this.tree_states)) {
                        this.tree_states[parent_] = {};
                    }
                    this.tree_states[parent_][view.children_field || null] = [
                        timestamp, paths, selected_paths];
                    if (store && view.attributes.tree_state) {
                        var tree_state_model = new Sao.Model(
                                'ir.ui.view_tree_state');
                        prm = tree_state_model.execute('set', [
                                this.model_name,
                                this.get_tree_domain(parent_),
                                view.children_field,
                                JSON.stringify(paths),
                                JSON.stringify(selected_paths)], {});
                        prms.push(prm);
                    }
                }
            }
            return jQuery.when.apply(jQuery, prms);
        },
        get_tree_domain: function(parent_) {
            var domain;
            if (parent_) {
                domain = (this.domain || []).concat([
                        [this.exclude_field, '=', parent_]]);
            } else {
                domain = this.domain;
            }
            return JSON.stringify(Sao.rpc.prepareObject(domain));
        },
        set_tree_state: function() {
            var parent_, timestamp, state, state_prm, tree_state_model;
            var view = this.current_view;
            if (!~['tree', 'form'].indexOf(view.view_type)) {
                return;
            }

            if (~this.tree_states_done.indexOf(view)) {
                return;
            }
            if (view.view_type == 'form' &&
                    !jQuery.isEmptyObject(this.tree_states_done)) {
                return;
            }

            parent_ = this.group.parent ? this.group.parent.id : null;
            timestamp = parent ? parent._timestamp : null;
            if (!(parent_ in this.tree_states)) {
                this.tree_states[parent_] = {};
            }
            state = this.tree_states[parent_][view.children_field || null];
            if (state) {
                if (timestamp != state[0]) {
                    state = undefined;
                }
            }
            if (state === undefined) {
                tree_state_model = new Sao.Model('ir.ui.view_tree_state');
                state_prm = tree_state_model.execute('get', [
                        this.model_name,
                        this.get_tree_domain(parent_),
                        view.children_field], {})
                    .then(function(state) {
                        return [timestamp,
                            JSON.parse(state[0]), JSON.parse(state[1])];
                    });
            } else {
                state_prm = jQuery.when(state);
            }
            state_prm.done(function(state) {
                var expanded_nodes, selected_nodes, record;
                this.tree_states[parent_][view.children_field || null] = state;
                expanded_nodes = state[1];
                selected_nodes = state[2];
                if (view.view_type == 'tree') {
                    view.display(selected_nodes, expanded_nodes);
                } else {
                    if (!jQuery.isEmptyObject(selected_nodes)) {
                        for (var i = 0; i < selected_nodes[0].length; i++) {
                            var new_record = this.group.get(selected_nodes[0][i]);
                            if (!new_record) {
                                break;
                            } else {
                                record = new_record;
                            }
                        }
                        if (record && (record != this.current_record)) {
                            this.set_current_record(record);
                            // Force a display of the view to synchronize the
                            // widgets with the new record
                            view.display();
                        }
                    }
                }
            }.bind(this));
            this.tree_states_done.push(view);
        }
    });
}());

/* This file is part of Tryton.  The COPYRIGHT file at the top level of
   this repository contains the full copyright notices and license terms. */
(function() {
    'use strict';

    Sao.View = Sao.class_(Object, {
        init: function(screen, xml) {
            this.screen = screen;
            this.view_type = null;
            this.el = null;
            this.view_id = null;
            this.fields = {};
            var attributes = xml.children()[0].attributes;
            this.attributes = {};
            for (var i = 0, len = attributes.length; i < len; i++) {
                var attribute = attributes[i];
                this.attributes[attribute.name] = attribute.value;
            }
            screen.set_on_write(this.attributes.on_write);
        },
        set_value: function() {
        },
        get_fields: function() {
            return Object.keys(this.fields);
        },
        selected_records: function() {
            return [];
        },
        get_buttons: function() {
            return [];
        }
    });

    Sao.View.idpath2path = function(tree, idpath) {
        var path = [];
        var child_path;
        if (!idpath) {
            return [];
        }
        for (var i = 0, len = tree.rows.length; i < len; i++) {
            if (tree.rows[i].record.id == idpath[0]) {
                path.push(i);
                child_path = Sao.View.idpath2path(tree.rows[i],
                        idpath.slice(1, idpath.length));
                path = path.concat(child_path);
                break;
            }
        }
        return path;
    };

    Sao.View.parse = function(screen, xml, children_field,
            children_definitions) {
        switch (xml.children().prop('tagName')) {
            case 'tree':
                return new Sao.View.Tree(screen, xml, children_field,
                    children_definitions);
            case 'form':
                return new Sao.View.Form(screen, xml);
            case 'graph':
                return new Sao.View.Graph(screen, xml);
            case 'calendar':
                return new Sao.View.Calendar(screen, xml);
        }
    };

    Sao.View.resize = function(el) {
        // Let the browser compute the table size with the fixed layout
        // then set this size to the treeview to allow scroll on overflow
        // and set the table layout to auto to get the width from the content.
        if (!el) {
            el = jQuery(document);
        }
        el.find('.treeview').each(function() {
            var treeview = jQuery(this);
            treeview.css('width', '100%');
            treeview.children('.tree').css('table-layout', 'fixed');
        });
        el.find('.treeview').each(function() {
            var treeview = jQuery(this);
            if (treeview.width()) {
                treeview.css('width', treeview.width());
                treeview.children('.tree').css('table-layout', 'auto');
            }
        });
    };
    jQuery(window).resize(function() {
        Sao.View.resize();
    });

}());

/* This file is part of Tryton.  The COPYRIGHT file at the top level of
   this repository contains the full copyright notices and license terms. */
(function() {
    'use strict';

    Sao.View.Form = Sao.class_(Sao.View, {
        editable: true,
        init: function(screen, xml) {
            Sao.View.Form._super.init.call(this, screen, xml);
            this.view_type = 'form';
            this.el = jQuery('<div/>', {
                'class': 'form'
            });
            this.widgets = {};
            this.widget_id = 0;
            this.state_widgets = [];
            this.containers = [];
            this.notebooks = [];
            var root = xml.children()[0];
            var container = this.parse(screen.model, root);
            this.el.append(container.el);
        },
        _parse_node: function(model, child, container, attributes, labels) {
            var widget;
            switch (child.tagName) {
                case 'image':
                    this._parse_image(
                            model, child, container, attributes);
                    break;
                case 'separator':
                    this._parse_separator(
                            model, child, container, attributes);
                    break;
                case 'label':
                    widget = this._parse_label(
                            model, child, container, attributes);
                    if (attributes.name && widget) {
                        labels[attributes.name] = widget;
                    }
                    break;
                case 'newline':
                    container.add_row();
                    break;
                case 'button':
                    this._parse_button(child, container, attributes);
                    break;
                case 'notebook':
                    this._parse_notebook(
                            model, child, container, attributes);
                    break;
                case 'page':
                    this._parse_page(model, child, container, attributes);
                    break;
                case 'field':
                    widget = this._parse_field(
                            model, child, container, attributes);
                    if ((attributes.name in labels) &&
                            widget &&
                            widget.labelled) {
                        var label = labels[attributes.name];
                        label.el.uniqueId();
                        widget.labelled.uniqueId();
                        widget.labelled.attr(
                                'aria-labelledby', label.el.attr('id'));
                        label.el.attr('for', widget.labelled.attr('id'));
                    }
                    break;
                case 'group':
                    this._parse_group(model, child, container, attributes);
                    break;
                case 'hpaned':
                    this._parse_paned(model, child, container, attributes,
                            'horizontal');
                    break;
                case 'vpaned':
                    this._parse_paned(model, child, container, attributes,
                            'vertical');
                    break;
                case 'child':
                    this._parse_child(model, child, container, attributes);
                    break;
            }
        },
        parse: function(model, node, container) {
            if (container === undefined) {
                container = new Sao.View.Form.Container(
                    Number(node.getAttribute('col') || 4));
                this.containers.push(container);
            }
            var labels = {};
            var _parse = function(index, child) {
                var attributes = {};
                for (var i = 0, len = child.attributes.length; i < len; i++) {
                    var attribute = child.attributes[i];
                    attributes[attribute.name] = attribute.value;
                }
                ['readonly', 'invisible'].forEach(function(name) {
                    if (attributes[name]) {
                        attributes[name] = attributes[name] == 1;
                    }
                });
                ['yexpand', 'yfill', 'xexpand', 'xfill', 'colspan'].forEach(
                        function(name) {
                            if (attributes[name]) {
                                attributes[name] = Number(attributes[name]);
                            }
                        });
                this._parse_node(model, child, container, attributes, labels);
            };
            jQuery(node).children().each(_parse.bind(this));
            return container;
        },
        _parse_image: function(model, node, container, attributes) {
            var image = new Sao.View.Form.Image_(attributes);
            this.state_widgets.push(image);
            container.add(attributes, image);
        },
        _parse_separator: function(model, node, container, attributes) {
            var name = attributes.name;
            var text = attributes.string;
            if (name in model.fields) {
                if (!attributes.states && (name in model.fields)) {
                    attributes.states = model.fields[name].description.states;
                }
                if (!text) {
                    text = model.fields[name].description.string;
                }
            }
            var separator = new Sao.View.Form.Separator(text, attributes);
            this.state_widgets.push(separator);
            container.add(attributes, separator);
        },
        _parse_label: function(model, node, container, attributes) {
            var name = attributes.name;
            var text = attributes.string;
            if (attributes.xexpand === undefined) {
                attributes.xexpand = 0;
            }
            if (name in model.fields) {
                if (name == this.screen.exclude_field) {
                    container.add(attributes);
                    return;
                }
                if (!attributes.states && (name in model.fields)) {
                    attributes.states = model.fields[name].description.states;
                }
                if (!text) {
                    // TODO RTL and translation
                    text = model.fields[name]
                        .description.string + ': ';
                }
                if (attributes.xalign === undefined) {
                    attributes.xalign = 1.0;
                }
            }
            var label;
            if (text) {
                label = new Sao.View.Form.Label(text, attributes);
                this.state_widgets.push(label);
            }
            container.add(attributes, label);
            return label;
        },
        _parse_button: function(node, container, attributes) {
            var button = new Sao.common.Button(attributes);
            this.state_widgets.push(button);
            container.add(attributes, button);
            button.el.click(button, this.button_clicked.bind(this));
        },
        _parse_notebook: function(model, node, container, attributes) {
            if (attributes.colspan === undefined) {
                attributes.colspan = 4;
            }
            var notebook = new Sao.View.Form.Notebook(attributes);
            this.notebooks.push(notebook);
            this.state_widgets.push(notebook);
            container.add(attributes, notebook);
            this.parse(model, node, notebook);
        },
        _parse_page: function(model, node, container, attributes) {
            var text = attributes.string;
            if (attributes.name in model.fields) {
                var field = model.fields[attributes.name];
                if (attributes.name == this.screen.exclude_field) {
                    return;
                }
                ['states', 'string'].forEach(function(attr) {
                    if ((attributes[attr] === undefined) &&
                            (field.description[attr] !== undefined)) {
                        attributes[attr] = field.description[attr];
                    }
                });
            }
            var page = this.parse(model, node);
            page = new Sao.View.Form.Page(
                    container.add(page.el, attributes.string), attributes);
            this.state_widgets.push(page);
        },
        _parse_field: function(model, node, container, attributes) {
            var name = attributes.name;
            if (!(name in model.fields) || name == this.screen.exclude_field) {
                container.add(attributes);
                return;
            }
            if (!attributes.widget) {
                attributes.widget = model.fields[name]
                    .description.type;
            }
            var attribute_names = ['relation', 'domain', 'selection', 'help',
                'relation_field', 'string', 'views', 'add_remove', 'sort',
                'context', 'size', 'filename', 'autocomplete', 'translate',
                'create', 'delete', 'selection_change_with', 'schema_model'];
            for (var i in attribute_names) {
                var attr = attribute_names[i];
                if ((attr in model.fields[name].description) &&
                        (node.getAttribute(attr) === null)) {
                    attributes[attr] = model.fields[name]
                        .description[attr];
                }
            }
            var WidgetFactory = Sao.View.form_widget_get(
                    attributes.widget);
            if (!WidgetFactory) {
                container.add(attributes);
                return;
            }
            var widget = new WidgetFactory(name, model, attributes);
            widget.position = this.widget_id += 1;
            widget.view = this;
            // TODO expand, fill, height, width
            container.add(attributes, widget);
            if (this.widgets[name] === undefined) {
                this.widgets[name] = [];
            }
            this.widgets[name].push(widget);
            this.fields[name] = true;
            return widget;
        },
        _parse_group: function(model, node, container, attributes) {
            var group = new Sao.View.Form.Group(attributes);
            group.add(this.parse(model, node));
            this.state_widgets.push(group);
            container.add(attributes, group);
        },
        _parse_paned: function(model, node, container, attributes,
                              orientation) {
            if (attributes.yexpand === undefined) {
                attributes.yexpand = true;
            }
            if (attributes.yfill === undefined) {
                attributes.yfill = true;
            }
            var paned = new Sao.common.Paned(orientation);
            // TODO position
            container.add(attributes, paned);
            this.parse(model, node, paned);
        },
        _parse_child: function(model, node, paned, attributes) {
            var container = this.parse(model, node);
            var child;
            if (!paned.get_child1().children().length) {
                child = paned.get_child1();
            } else {
                child = paned.get_child2();
            }
            child.append(container.el);
        },
        get_buttons: function() {
            var buttons = [];
            for (var j in this.state_widgets) {
                var widget = this.state_widgets[j];
                if (widget instanceof Sao.common.Button) {
                    buttons.push(widget);
                }
            }
            return buttons;
        },
        display: function() {
            var record = this.screen.current_record;
            var field;
            var name;
            var promesses = {};
            if (record) {
                // Force to set fields in record
                // Get first the lazy one to reduce number of requests
                var fields = [];
                for (name in record.model.fields) {
                    field = record.model.fields[name];
                    fields.push([name, field.description.loading || 'eager']);
                }
                fields.sort(function(a, b) {
                    return a[1].localeCompare(b[1]);
                });
                fields.forEach(function(e) {
                    var name = e[0];
                    promesses[name] = record.load(name);
                });
            }
            var set_state = function(record, field, name) {
                var prm = jQuery.when();
                if (name in promesses) {
                    prm = promesses[name];
                }
                promesses[name] = prm.done(function() {
                    field.set_state(record);
                });
            };
            var display = function(record, field, name) {
                return function(widget) {
                    var prm = jQuery.when();
                    if (name in promesses) {
                        prm = promesses[name];
                    }
                    promesses[name] = prm.then(function() {
                        return widget.display(record, field);
                    });
                };
            };
            for (name in this.widgets) {
                var widgets = this.widgets[name];
                field = null;
                if (record) {
                    field = record.model.fields[name];
                }
                if (field) {
                    set_state(record, field, name);
                }
                widgets.forEach(display(record, field, name));
            }
            return jQuery.when.apply(jQuery,
                    jQuery.map(promesses, function(p) {
                        return p;
                    })
                ).done(function() {
                    var j;
                    for (j in this.state_widgets) {
                        var state_widget = this.state_widgets[j];
                        state_widget.set_state(record);
                    }
                    for (j in this.containers) {
                        var container = this.containers[j];
                        container.resize();
                    }
                    Sao.View.resize(this.el);
                }.bind(this));
        },
        set_value: function() {
            var record = this.screen.current_record;
            if (record) {
                var set_value = function(widget) {
                    widget.set_value(record, this);
                };
                for (var name in this.widgets) {
                    if (name in record.model.fields) {
                        var widgets = this.widgets[name];
                        var field = record.model.fields[name];
                        widgets.forEach(set_value, field);
                    }
                }
            }
        },
        button_clicked: function(event) {
            var button = event.data;
            button.el.prop('disabled', true);
            try {
                this.screen.button(button.attributes);
            } finally {
                button.el.prop('disabled', false);
            }
        },
        selected_records: function() {
            if (this.screen.current_record) {
                return [this.screen.current_record];
            }
            return [];
        },
        set_cursor: function(new_, reset_view) {
            var i, name, j;
            var focus_el, notebook, child;
            var widgets, error_el, pages, is_ancestor;

            var currently_focused = jQuery(document.activeElement);
            var has_focus = currently_focused.closest(this.el) > 0;
            if (reset_view || has_focus) {
                if (reset_view) {
                    for (i = 0; i < this.notebooks.length; i++) {
                        notebook = this.notebooks[i];
                        notebook.set_current_page(0);
                    }
                }
                if (this.attributes.cursor in this.widgets) {
                    focus_el = Sao.common.find_focusable_child(
                            this.widgets[this.attributes.cursor][0].el);
                } else {
                    child = Sao.common.find_focusable_child(this.el);
                    if (child) {
                        child.focus();
                    }
                }
            }

            var record = this.screen.current_record;
            if (record) {
                var invalid_widgets = [];
                // We use the has-error class to find the invalid elements
                // because Sao.common.find_focusable_child use the :visible
                // selector which acts differently than GTK's get_visible
                var error_els = this.el.find('.has-error');
                var invalid_fields = record.invalid_fields();
                for (name in invalid_fields) {
                    widgets = this.widgets[name];
                    for (i = 0; i < error_els.length; i++) {
                        error_el = jQuery(error_els[i]);
                        for (j = 0; j < widgets.length; j++) {
                            if (error_el.closest(widgets[j].el).length > 0) {
                                invalid_widgets.push(error_el);
                                break;
                            }
                        }
                    }
                }
                if (invalid_widgets.length > 0) {
                    focus_el = Sao.common.find_first_focus_widget(this.el,
                            invalid_widgets);
                }
            }

            if (focus_el) {
                for (i = 0; i < this.notebooks.length; i++) {
                    notebook = this.notebooks[i];
                    pages = notebook.get_n_pages();
                    for (j = 0; j < pages; j++) {
                        child = notebook.get_nth_page(j);
                        is_ancestor = (
                                jQuery(focus_el).closest(child).length > 0);
                        if (is_ancestor) {
                            notebook.set_current_page(j);
                            break;
                        }
                    }
                }
                // Only input & textarea can grab the focus
                jQuery(focus_el).find('input,select,textarea').focus();
            }
        }
    });

    Sao.View.Form.Container = Sao.class_(Object, {
        init: function(col) {
            if (col === undefined) col = 4;
            this.col = col;
            this.el = jQuery('<table/>', {
                'class': 'form-container responsive responsive-noheader'
            });
            this.add_row();
        },
        add_row: function() {
            this.el.append(jQuery('<tr/>'));
        },
        rows: function() {
            return this.el.children().children('tr');
        },
        row: function() {
            return this.rows().last();
        },
        add: function(attributes, widget) {
            var colspan = attributes.colspan;
            if (colspan === undefined) colspan = 1;
            var xfill = attributes.xfill;
            if (xfill === undefined) xfill = 1;
            var xexpand = attributes.xexpand;
            if (xexpand === undefined) xexpand = 1;
            var len = 0;
            var row = this.row();
            row.children().map(function(i, e) {
                len += Number(jQuery(e).attr('colspan') || 1);
            });
            if (len + colspan > this.col) {
                this.add_row();
                row = this.row();
            }
            var el;
            if (widget) {
                el = widget.el;
            }
            var cell = jQuery('<td/>', {
                'colspan': colspan,
                'class': widget ? widget.class_ || '' : ''
            }).append(el);
            row.append(cell);

            if (!widget) {
                return;
            }

            // TODO yexpand
            if (attributes.yfill) {
                cell.css('vertical-align', 'top');
            }

            if (attributes.xalign !== undefined) {
                // TODO replace by start/end when supported
                cell.css('text-align', attributes.xalign >= 0.5? 'right': 'left');
            }
            if (xexpand) {
                cell.addClass('xexpand');
                cell.css('width', '100%');
            }
            if (xfill) {
                cell.addClass('xfill');
                if (xexpand) {
                    el.css('width', '100%');
                }
            }

            if (attributes.help) {
                widget.el.data('toggle', 'tooltip');
                widget.el.attr('title', attributes.help);
                widget.el.tooltip();
            }
            // dirty fix for span rendering
            //      > bugs.tryton.org/issue5419
            if (this.col == 6 && !(colspan == 1 || colspan == 6)) {
                cell.removeClass('xexpand');
                cell.removeClass('xfill');
            }
        },
        resize: function() {
            var rows = this.rows().toArray();
            var widths = [];
            var col = this.col;
            var has_expand = false;
            var i, j;
            var get_xexpands = function(row) {
                row = jQuery(row);
                var xexpands = [];
                i = 0;
                row.children().map(function() {
                    var cell = jQuery(this);
                    var colspan = Math.min(Number(cell.attr('colspan')), col);
                    if (cell.hasClass('xexpand') &&
                        (!jQuery.isEmptyObject(cell.children())) &&
                        (cell.children(':not(.tooltip)').css('display') != 'none')) {
                        xexpands.push([cell, i]);
                    }
                    i += colspan;
                });
                return xexpands;
            };
            // Sort rows to compute first the most constraining row
            // which are the one with the more xexpand cells
            // and with the less colspan
            rows.sort(function(a, b) {
                a = get_xexpands(a);
                b = get_xexpands(b);
                if (a.length == b.length) {
                    var reduce = function(previous, current) {
                        var cell = current[0];
                        var colspan = Math.min(
                            Number(cell.attr('colspan')), col);
                        return previous + colspan;
                    };
                    return a.reduce(reduce, 0) - b.reduce(reduce, 0);
                } else {
                    return b.length - a.length;
                }
            });
            rows.forEach(function(row) {
                row = jQuery(row);
                var xexpands = get_xexpands(row);
                var width = 100 / xexpands.length;
                xexpands.forEach(function(e) {
                    var cell = e[0];
                    i = e[1];
                    var colspan = Math.min(Number(cell.attr('colspan')), col);
                    var current_width = 0;
                    for (j = 0; j < colspan; j++) {
                        current_width += widths[i + j] || 0;
                    }
                    for (j = 0; j < colspan; j++) {
                        if (!current_width) {
                            widths[i + j] = width / colspan;
                        } else if (current_width > width) {
                            // Split proprotionally the difference over all cells
                            // following their current width
                            var diff = current_width - width;
                            if (widths[i + j]) {
                                widths[i + j] -= (diff /
                                    (current_width / widths[i + j]));
                            }
                        }
                    }
                });
                if (!jQuery.isEmptyObject(xexpands)) {
                    has_expand = true;
                }
            });
            rows.forEach(function(row) {
                row = jQuery(row);
                i = 0;
                row.children().map(function() {
                    var cell = jQuery(this);
                    var colspan = Math.min(Number(cell.attr('colspan')), col);
                    if (cell.hasClass('xexpand') &&
                        (cell.children(':not(.tooltip)').css('display') !=
                         'none')) {
                        var width = 0;
                        for (j = 0; j < colspan; j++) {
                            width += widths[i + j] || 0;
                        }
                        cell.css('width', width + '%');
                    } else {
                        cell.css('width', '');
                    }
                    if (cell.children().css('display') == 'none') {
                        cell.css('visibility', 'collapse');
                    } else {
                        cell.css('visibility', 'visible');
                    }
                    i += colspan;
                });
            });
            if (has_expand) {
                this.el.css('width', '100%');
            } else {
                this.el.css('width', '');
            }
        }
    });

    Sao.View.Form.StateWidget = Sao.class_(Object, {
        init: function(attributes) {
            this.attributes = attributes;
        },
        set_state: function(record) {
            var state_changes;
            if (record) {
                state_changes = record.expr_eval(this.attributes.states || {});
            } else {
                state_changes = {};
            }
            var invisible = state_changes.invisible;
            if (invisible === undefined) {
                invisible = this.attributes.invisible;
            }
            if (invisible) {
                this.hide();
            } else {
                this.show();
            }
        },
        show: function() {
            this.el.show();
        },
        hide: function() {
            this.el.hide();
        }
    });

    Sao.View.Form.LabelMixin = Sao.class_(Sao.View.Form.StateWidget, {
        set_state: function(record) {
            Sao.View.Form.LabelMixin._super.set_state.call(this, record);
            var field;
            if (this.attributes.name && record) {
                field = record.model.fields[this.attributes.name];
            }
            if ((this.attributes.string === undefined) && field) {
                var text = '';
                if (record) {
                    text = field.get_client(record) || '';
                }
                this.label_el.val(text);
            }
            var state_changes;
            if (record) {
                state_changes = record.expr_eval(this.attributes.states || {});
            } else {
                state_changes = {};
            }
            if ((field && field.description.required) ||
                    state_changes.required) {
                this.label_el.addClass('required');
            } else {
                this.label_el.removeClass('required');
            }
            if ((field && field.description.readonly) ||
                    state_changes.readonly) {
                this.label_el.removeClass('editable');
                this.label_el.removeClass('required');
            } else {
                this.label_el.addClass('editable');
            }
        }
    });

    Sao.View.Form.Separator = Sao.class_(Sao.View.Form.LabelMixin, {
        init: function(text, attributes) {
            Sao.View.Form.Separator._super.init.call(this, attributes);
            this.el = jQuery('<div/>', {
                'class': 'form-separator'
            });
            this.label_el = jQuery('<label/>');
            if (text) {
                this.label_el.text(text);
            }
            this.el.append(this.label_el);
            this.el.append(jQuery('<hr/>'));
        }
    });

    Sao.View.Form.Label = Sao.class_(Sao.View.Form.LabelMixin, {
        class_: 'form-label',
        init: function(text, attributes) {
            Sao.View.Form.Label._super.init.call(this, attributes);
            this.el = this.label_el = jQuery('<label/>', {
                text: text,
                'class': this.class_ + ' form-label'
            });
        }
    });

    Sao.View.Form.Notebook = Sao.class_(Sao.View.Form.StateWidget, {
        class_: 'form-notebook',
        init: function(attributes) {
            Sao.View.Form.Notebook._super.init.call(this, attributes);
            this.el = jQuery('<div/>', {
                'class': this.class_
            });
            this.nav = jQuery('<ul/>', {
                'class': 'nav nav-tabs',
                role: 'tablist'
            }).appendTo(this.el);
            this.panes = jQuery('<div/>', {
                'class': 'tab-content'
            }).appendTo(this.el);
            this.selected = false;
        },
        add: function(tab, text) {
            var pane = jQuery('<div/>', {
                'role': 'tabpanel',
                'class': 'tab-pane',
            }).uniqueId();
            var tab_id = pane.attr('id');
            var page = jQuery('<li/>', {
                'role': 'presentation'
            }).append(
                jQuery('<a/>', {
                    'aria-controls': tab_id,
                    'role': 'tab',
                    'data-toggle': 'tab',
                    'href': '#' + tab_id
                }).append(text)
                .on('shown.bs.tab', function() {
                    Sao.View.resize(tab);
                })).appendTo(this.nav);
            pane.html(tab).appendTo(this.panes);
            if (!this.selected) {
                // Can not use .tab('show')
                page.addClass('active');
                pane.addClass('active');
                this.selected = true;
            }
            return page;
        },
        set_current_page: function(page_index) {
            var tab = this.nav.find(
                    'li[role="presentation"]:eq(' + page_index + ') a');
            tab.tab('show');
        },
        get_n_pages: function() {
            return this.nav.find("li[role='presentation']").length;
        },
        get_nth_page: function(page_index) {
            return jQuery(this.panes.find("div[role='tabpanel']")[page_index]);
        }
    });

    Sao.View.Form.Page = Sao.class_(Sao.View.Form.StateWidget, {
        init: function(el, attributes) {
            Sao.View.Form.Page._super.init.call(this, attributes);
            this.el = el;
        }
    });

    Sao.View.Form.Group = Sao.class_(Sao.View.Form.StateWidget, {
        class_: 'form-group_',
        init: function(attributes) {
            Sao.View.Form.Group._super.init.call(this, attributes);
            this.el = jQuery('<div/>', {
                'class': this.class_
            });
        },
        add: function(widget) {
            this.el.append(widget.el);
        }
    });

    Sao.View.Form.Image_ = Sao.class_(Sao.View.Form.StateWidget, {
        class_: 'form-image_',
        init: function(attributes) {
            Sao.View.Form.Image_._super.init.call(this, attributes);
            this.el = jQuery('<div/>', {
                'class_': this.class_
            });
            this.img = jQuery('<img/>', {
                'class': 'center-block'
            }).appendTo(this.el);
            Sao.common.ICONFACTORY.register_icon(attributes.name)
                .done(function(url) {
                    this.img.attr('src', url);
                }.bind(this));
        }
    });

    Sao.View.form_widget_get = function(type) {
        switch (type) {
            case 'char':
                return Sao.View.Form.Char;
            case 'password':
                return Sao.View.Form.Password;
            case 'date':
                return Sao.View.Form.Date;
            case 'datetime':
                return Sao.View.Form.DateTime;
            case 'time':
                return Sao.View.Form.Time;
            case 'timedelta':
                return Sao.View.Form.TimeDelta;
            case 'integer':
            case 'biginteger':
                return Sao.View.Form.Integer;
            case 'float':
            case 'numeric':
                return Sao.View.Form.Float;
            case 'selection':
                return Sao.View.Form.Selection;
            case 'boolean':
                return Sao.View.Form.Boolean;
            case 'text':
                return Sao.View.Form.Text;
            case 'richtext':
                return Sao.View.Form.RichText;
            case 'many2one':
                return Sao.View.Form.Many2One;
            case 'one2one':
                return Sao.View.Form.One2One;
            case 'reference':
                return Sao.View.Form.Reference;
            case 'one2many':
                return Sao.View.Form.One2Many;
            case 'many2many':
                return Sao.View.Form.Many2Many;
            case 'binary':
                return Sao.View.Form.Binary;
            case 'multiselection':
                return Sao.View.Form.MultiSelection;
            case 'image':
                return Sao.View.Form.Image;
            case 'url':
                return Sao.View.Form.URL;
            case 'email':
                return Sao.View.Form.Email;
            case 'callto':
                return Sao.View.Form.CallTo;
            case 'sip':
                return Sao.View.Form.SIP;
            case 'progressbar':
                return Sao.View.Form.ProgressBar;
            case 'dict':
                return Sao.View.Form.Dict;
            case 'source':
                return Sao.View.Form.Source;
        }
    };


    Sao.View.Form.Widget = Sao.class_(Object, {
        init: function(field_name, model, attributes) {
            this.field_name = field_name;
            this.model = model;
            this.view = null;  // Filled later
            this.attributes = attributes;
            this.el = null;
            this.position = 0;
            this.visible = true;
            this.labelled = null;  // Element which received the labelledby
        },
        display: function(record, field) {
            var readonly = this.attributes.readonly;
            var invisible = this.attributes.invisible;
            if (!field) {
                if (readonly === undefined) {
                    readonly = true;
                }
                if (invisible === undefined) {
                    invisible = false;
                }
                this.set_readonly(readonly);
                this.set_invisible(invisible);
                return;
            }
            var state_attrs = field.get_state_attrs(record);
            if (readonly === undefined) {
                readonly = state_attrs.readonly;
                if (readonly === undefined) {
                    readonly = false;
                }
            }
            if (this.view.screen.attributes.readonly) {
                readonly = true;
            }
            this.set_readonly(readonly);
            var invalid = state_attrs.invalid;
            if (!readonly && invalid) {
                this.el.addClass('has-error');
            } else {
                this.el.removeClass('has-error');
            }
            if (invisible === undefined) {
                invisible = field.get_state_attrs(record).invisible;
                if (invisible === undefined) {
                    invisible = false;
                }
            }
            this.set_invisible(invisible);
        },
        record: function() {
            if (this.view && this.view.screen) {
                return this.view.screen.current_record;
            }
        },
        field: function() {
            var record = this.record();
            if (record) {
                return record.model.fields[this.field_name];
            }
        },
        focus_out: function() {
            if (!this.field()) {
                return;
            }
            if (!this.visible) {
                return;
            }
            this.set_value(this.record(), this.field());
        },
        set_value: function(record, field) {
        },
        set_readonly: function(readonly) {
            this.el.prop('disabled', readonly);
        },
        set_invisible: function(invisible) {
            this.visible = !invisible;
            if (invisible) {
                this.el.hide();
                this.el.css('width', '0px');
            } else {
                this.el.show();
                this.el.css('width', '100%');
            }
        }
    });

    function TreeElement(){
        this.init = function(parent, element, good_text, lvl){
            if (!element || !element.description)
                return false;

            this.help       = good_text || '';
            this.parent     = parent || null;
            this.element    = element;
            this.title      = element.description;
            this.code       = element.translated + '(' + element.fct_args + ')';
            this.lvl        = lvl;
            this.el         = this.init_tree_element();
            this.childs     = [];
            this.visible    = true;
            this.is_parent  = false;
            this.expanded   = false;

            if (this.parent){
                this.parent.append_children(this);
                var spacer = '';
                while(lvl--)
                    spacer = spacer + '\t';
                this.set_visibility(false);
            }
            return true;
        };
        this.set_visibility = function(visible){
            if (visible){
                this.el.show();
                if (this.is_parent && this.expanded)
                    for (var j in this.childs)
                        this.childs[j].set_visibility(visible);
            } else{
                this.el.hide();
                for (var i in this.childs)
                    this.childs[i].set_visibility(visible);
            }
            this.visible = visible;
        };
        this.init_tree_element = function(){
            var td, table, tbody, tr, expander, content, text;
            var tr_container, td_container;

            tr_container = jQuery('<tr/>').css({
                'display': 'inline-block',
                'width': '100%'
            });
            td_container = jQuery('<td/>').appendTo(tr_container).css({
                'display': 'inline-block',
                'width': '100%'
            });
            td = jQuery('<td/>').appendTo(td_container);
            td.css('overflow', 'hidden');
            table = jQuery('<table/>').appendTo(td).css('width', '100%');
            tbody = jQuery('<tbody/>').appendTo(table);
            tr = jQuery('<tr/>').appendTo(tbody);
            this.expander = jQuery('<td/>', {
                'class': 'expander'
            }).appendTo(tr);
            this.expander.css({
                'width': parseInt(this.lvl * 30) + 'px',
                'display': 'inline-block'
            });
            content = jQuery('<td/>').appendTo(tr);
            text = jQuery('<p/>', {
                'draggable': 'true',
                'data-toggle': 'tooltip',
                'title': this.help
            }).appendTo(content).text(this.title);

            /* events managment */
            text[0].addEventListener('dragstart', function(event){
                event.dataTransfer.setData("text", this.code);
            }.bind(this));

            tr_container[0].addEventListener('click', function(event){
                if (this.is_parent)
                    this.set_expander(!this.expanded);
                for (var i in this.childs){
                    this.childs[i].set_visibility(this.expanded);
                }
            }.bind(this));

            return tr_container;
        };
        this.get_element = function(){
            return this.el;
        };
        this.set_expander = function(expanded){
            var icon = '';
            if (expanded)
                icon = 'minus';
            else
                icon = 'plus';

            this.expander.empty();
            var span = jQuery('<span/>', {
                'class': 'glyphicon glyphicon-' + icon
            }).appendTo(this.expander);
            span.html('&nbsp;');
            span.css({
                'float': 'right'
            });
            this.expanded = expanded;
        };
        this.append_children = function(children){
            this.childs.push(children);
            if (!this.is_parent){
                this.set_expander(false);
                this.is_parent = true;
            }
        };
    }

    // [Coog specific] widget Source (engine)
    Sao.View.Form.Source = Sao.class_(Sao.View.Form.Widget, {
        class_: 'form-source',
        init: function(field_name, model, attributes) {
            Sao.View.Form.Source._super.init.call(this, field_name, model,
                attributes);
            this.el = jQuery('<div/>', {
                'class': this.class_
            });
            this.tree_data_field = attributes.context_tree || null;

            this.init_tree(4);
            this.init_editor(8);

            this.tree_data = [];
            this.tree_elements = [];
            this.value = '';
            this.json_data = '';
        },
        init_editor: function(width){
            var button_apply_command = function(evt) {
                var success = document.execCommand(evt.data);
                // if (!success)
                //     my_custom_exec(evt.data);
            };

            var add_buttons = function(buttons) {
                var i, properties, button;
                var group = jQuery('<div/>', {
                    'class': 'btn-group',
                    'role': 'group'
                }).appendTo(this.toolbar);
                for (i in buttons) {
                    properties = buttons[i];
                    button = jQuery('<button/>', {
                        'class': 'btn btn-default',
                        'type': 'button'
                    }).append(jQuery('<span/>', {
                        'class': 'glyphicon glyphicon-' + properties.icon
                    })).appendTo(group);
                    button.click(properties.command, button_apply_command);
                }
            }.bind(this);
            this.sc_editor = jQuery('<div/>', {
                'class': 'panel panel-default col-md-' + parseInt(width)
            }).appendTo(this.el).css('padding', '0');

            this.toolbar = jQuery('<div/>', {
                'class': 'btn-toolbar',
                'role': 'toolbar'
            }).appendTo(jQuery('<div/>', {
                'class': 'panel-heading'
            }).appendTo(this.sc_editor));
            this.toolbar.css('width', '100%');

            add_buttons([
                    {
                        'icon': 'arrow-left',
                        'command': 'undo'
                    }, {
                        'icon': 'arrow-right',
                        'command': 'redo'
                    }, {
                        'icon': 'ok',
                        'command': 'check'
                    }]);

            this.input = jQuery('<div/>', {
                'class': 'richtext pre',
                'contenteditable': true
            }).appendTo(jQuery('<div/>', {
                'class': 'panel-body'
            }).appendTo(this.sc_editor).css('padding', '5px'));
            this.input.css({
                'height': '33em',
                'overflow': 'auto'
            });
        },
        init_tree: function(width){
            var container = jQuery('<div/>', {
                'class': 'col-md-' + parseInt(width)
            }).appendTo(this.el);
            this.sc_tree = jQuery('<div/>', {
                'class': 'treeview responsive'
            }).appendTo(container).css('padding', '0');

            this.table = jQuery('<table/>', {
                'class': 'tree table table-hover'
            }).appendTo(this.sc_tree);

            this.tbody = jQuery('<tbody/>').appendTo(this.table);
            this.tbody.css({
                'display': 'block',
                'height': '35em'
            });
        },
        display: function(record, field){
            Sao.View.Form.Source._super.display.call(this, record, field);

            var display_code = function(str){
                var lines = str.split('\n');
                var ret = [];
                for (var i in lines){
                    jQuery('<div/>').appendTo(this.input).text(lines[i]).css(
                        'font-family', 'monospace'
                    );
                }
            }.bind(this);

            var display_tree = function(){
                var tree_data, json_data;
                json_data = record.field_get_client(this.tree_data_field);
                if (json_data){
                    if (json_data != this.json_data){
                        this.clear_tree();
                        this.json_data = json_data;
                        tree_data = JSON.parse(this.json_data);
                        this.populate_tree(tree_data);
                    }
                }else {
                    this.tree_data = [];
                    this.clear_tree();
                }
            }.bind(this);

            var value = field.get_client(record);
            if (value != this.value){
                this.value = value;
                this.input.empty();
                display_code(this.value);
            }

            if (this.tree_data_field){
                if (!record)
                    return;
                record.load(this.tree_data_field).then(display_tree);
            }
        },
        append_tree_element: function(parent, element, good_text, iter_lvl){
            var treeElem = new TreeElement();
            if (treeElem.init(parent, element, good_text, iter_lvl)){
                treeElem.get_element().appendTo(this.tbody);
                return treeElem;
            }
            return null;
        },
        clear_tree: function(){
            this.tbody.empty();
        },
        populate_tree: function(tree_data, iter_lvl, parent){
            var element, cnt;
            var desc, param_txt, good_text, new_iter;

            if (!iter_lvl)
                iter_lvl = 1;
            for (cnt in tree_data){
                element = tree_data[cnt];
                desc = element.long_description || '';
                // !!!> change by sao traduction
                if (element.fct_args)
                    param_txt = 'Parameters: ' + element.fct_args;
                else
                    param_txt = 'No Parameters';
                if (desc)
                    good_text = desc + '\n\n' + param_txt;
                else
                    good_text = param_txt;
                new_iter = this.append_tree_element(parent, element, good_text, iter_lvl);
                if (element.children && element.children.length > 0)
                    this.populate_tree(element.children, iter_lvl + 1, new_iter);
            }
        },
        set_value: function(record, field){
            var content = [];
            this.input.children('div').each(function(){
                if (content.length > 0)
                    content[content.length -1] = content[content.length -1] + '\n';
                content.push(jQuery(this).text());
            });
            field.set_client(record, content.join(''));
        }
    });

    Sao.View.Form.Char = Sao.class_(Sao.View.Form.Widget, {
        class_: 'form-char',
        init: function(field_name, model, attributes) {
            Sao.View.Form.Char._super.init.call(this, field_name, model,
                attributes);
            this.el = jQuery('<div/>', {
                'class': this.class_
            });
            this.group = jQuery('<div/>', {
                'class': 'input-group input-group-sm'
            }).appendTo(this.el);
            this.input = this.labelled = jQuery('<input/>', {
                'type': 'text',
                'class': 'form-control input-sm'
            }).appendTo(this.group);
            if (attributes.autocomplete) {
                this.datalist = jQuery('<datalist/>').appendTo(this.el);
                this.datalist.uniqueId();
                this.input.attr('list', this.datalist.attr('id'));
            }
            this.el.change(this.focus_out.bind(this));

            if (!attributes.size) {
                this.group.css('width', '100%');
            }
        },
        display: function(record, field) {
            Sao.View.Form.Char._super.display.call(this, record, field);
            if (this.datalist) {
                this.datalist.children().remove();
                var selection = [];
                if (record) {
                    selection = record.autocompletion[this.field_name] || [];
                }
                selection.forEach(function(e) {
                    jQuery('<option/>', {
                        'value': e
                    }).appendTo(this.datalist);
                }.bind(this));
            }

            // Set size
            var length = '';
            var width = '100%';
            if (record) {
                length = record.expr_eval(this.attributes.size);
                if (length > 0) {
                    width = null;
                }
            }
            this.input.attr('maxlength', length);
            this.input.attr('size', length);
            this.group.css('width', width);

            if (record) {
                var value = record.field_get_client(this.field_name);
                this.input.val(value || '');
            } else {
                this.input.val('');
            }
        },
        set_value: function(record, field) {
            field.set_client(record, this.input.val());
        },
        set_readonly: function(readonly) {
            this.input.prop('readonly', readonly);
        },
        focus: function() {
            this.input.focus();
        }
    });

    Sao.View.Form.Password = Sao.class_(Sao.View.Form.Char, {
        class_: 'form-password',
        init: function(field_name, model, attributes) {
            Sao.View.Form.Password._super.init.call(this, field_name, model,
                attributes);
            this.input.prop('type', 'password');
        }
    });

    Sao.View.Form.Date = Sao.class_(Sao.View.Form.Widget, {
        class_: 'form-date',
        _width: '12em',
        init: function(field_name, model, attributes) {
            Sao.View.Form.Date._super.init.call(this, field_name, model,
                attributes);
            this.el = jQuery('<div/>', {
                'class': this.class_
            });
            this.date = this.labelled = jQuery('<div/>', {
                'class': 'input-group input-group-sm'
            }).appendTo(this.el);
            this.input = jQuery('<input/>', {
                'type': 'text',
                'class': 'form-control input-sm'
            }).appendTo(this.date);
            jQuery('<span/>', {
                'class': 'input-group-btn'
            }).append(jQuery('<button/>', {
                'class': 'btn btn-default',
                'type': 'button'
            }).append(jQuery('<span/>', {
                'class': 'glyphicon glyphicon-calendar'
            }))).appendTo(this.date);
            this.date.datetimepicker();
            this.date.css('width', this._width);
            this.date.on('dp.change', this.focus_out.bind(this));
        },
        get_format: function(record, field) {
            return field.date_format(record);
        },
        get_value: function(record, field) {
            var value = this.date.data('DateTimePicker').date();
            if (value) {
                // [Bug Sao] - DateTimePicker.date() return dateTime
                // TODO: report to tryton
                value.startOf('day');
                value.isDate = true;
            }
            return value;
        },
        display: function(record, field) {
            if (record && field) {
                this.date.data('DateTimePicker').format(
                    Sao.common.moment_format(this.get_format(record, field)));
            }
            Sao.View.Form.Date._super.display.call(this, record, field);
            var value;
            if (record) {
                value = field.get_client(record);
            } else {
                value = null;
            }
            this.date.data('DateTimePicker').date(value);
        },
        focus: function() {
            this.input.focus();
        },
        set_value: function(record, field) {
            field.set_client(record, this.get_value(record, field));
        },
        set_readonly: function(readonly) {
            this.date.find('button').prop('disabled', readonly);
            this.date.find('input').prop('readonly', readonly);
        }
    });

    Sao.View.Form.DateTime = Sao.class_(Sao.View.Form.Date, {
        class_: 'form-datetime',
        _width: '25em',
        get_format: function(record, field) {
            return field.date_format(record) + ' ' + field.time_format(record);
        },
        get_value: function(record, field) {
            var value = this.date.data('DateTimePicker').date();
            if (value) {
                value.isDateTime = true;
            }
            return value;
        }
    });

    Sao.View.Form.Time = Sao.class_(Sao.View.Form.Date, {
        class_: 'form-time',
        _width: '10em',
        get_format: function(record, field) {
            return field.time_format(record);
        },
        get_value: function(record, field) {
            var value = this.date.data('DateTimePicker').date();
            if (value) {
                value.isTime = true;
            }
            return value;
        }
    });

    Sao.View.Form.TimeDelta = Sao.class_(Sao.View.Form.Widget, {
        class_: 'form-timedelta',
        init: function(field_name, model, attributes) {
            Sao.View.Form.TimeDelta._super.init.call(this, field_name, model,
                attributes);
            this.el = jQuery('<div/>', {
                'class': this.class_
            });
            this.input = this.labelled = jQuery('<input/>', {
                'type': 'text',
                'class': 'form-control input-sm'
            }).appendTo(this.el);
            this.el.change(this.focus_out.bind(this));
        },
        display: function(record, field) {
            Sao.View.Form.TimeDelta._super.display.call(this, record, field);
            if (record) {
                var value = record.field_get_client(this.field_name);
                this.input.val(value || '');
            } else {
                this.input.val('');
            }
        },
        focus: function() {
            this.input.focus();
        },
        set_value: function(record, field) {
            field.set_client(record, this.input.val());
        },
        set_readonly: function(readonly) {
            this.input.prop('readonly', readonly);
        }
    });

    Sao.View.Form.Integer = Sao.class_(Sao.View.Form.Char, {
        class_: 'form-integer',
        init: function(field_name, model, attributes) {
            Sao.View.Form.Integer._super.init.call(this, field_name, model,
                attributes);
            this.input.attr('type', 'text');
            this.input.attr('width', 8);
            this.group.css('width', '');
            this.factor = Number(attributes.factor || 1);
        },
        set_value: function(record, field) {
            field.set_client(record, this.input.val(), undefined, this.factor);
        },
        display: function(record, field) {
            // Skip Char call
            Sao.View.Form.Char._super.display.call(this, record, field);
            if (record) {
                var value = record.model.fields[this.field_name]
                    .get_client(record, this.factor);
                this.input.val(value);
            } else {
                this.input.val('');
            }
        }
    });

    Sao.View.Form.Float = Sao.class_(Sao.View.Form.Integer, {
        class_: 'form-float'
    });

    Sao.View.Form.Selection = Sao.class_(Sao.View.Form.Widget, {
        class_: 'form-selection',
        init: function(field_name, model, attributes) {
            Sao.View.Form.Selection._super.init.call(this, field_name, model,
                attributes);
            this.el = jQuery('<div/>', {
                'class': this.class_
            });
            this.select = this.labelled = jQuery('<select/>', {
                'class': 'form-control input-sm'
            });
            this.el.append(this.select);
            this.select.change(this.focus_out.bind(this));
            Sao.common.selection_mixin.init.call(this);
            this.init_selection();
        },
        init_selection: function(key) {
            Sao.common.selection_mixin.init_selection.call(this, key,
                this.set_selection.bind(this));
        },
        update_selection: function(record, field, callbak) {
            Sao.common.selection_mixin.update_selection.call(this, record,
                field, function(selection) {
                    this.set_selection(selection);
                    if (callbak) {
                        callbak();
                    }
                }.bind(this));
        },
        set_selection: function(selection) {
            var select = this.select;
            select.empty();
            selection.forEach(function(e) {
                select.append(jQuery('<option/>', {
                    'value': JSON.stringify(e[0]),
                    'text': e[1]
                }));
            });
        },
        display_update_selection: function(record, field) {
            var dfrd = jQuery.Deferred();
            this.update_selection(record, field, function() {
                if (!field) {
                    this.select.val('');
                    dfrd.resolve();
                    return;
                }
                var value = field.get(record);
                var prm, found = false;
                for (var i = 0, len = this.selection.length; i < len; i++) {
                    if (this.selection[i][0] === value) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    prm = Sao.common.selection_mixin.get_inactive_selection
                        .call(this, value);
                    prm = prm.done(function(inactive) {
                        this.select.append(jQuery('<option/>', {
                            value: JSON.stringify(inactive[0]),
                            text: inactive[1],
                            disabled: true
                        }));
                    }.bind(this));
                } else {
                    prm = jQuery.when();
                }
                prm.done(function() {
                    this.select.val(JSON.stringify(value));
                    dfrd.resolve();
                }.bind(this));
            }.bind(this));
            return (dfrd.promise());
        },
        display: function(record, field) {
            Sao.View.Form.Selection._super.display.call(this, record, field);
            return this.display_update_selection(record, field);
        },
        focus: function() {
            this.select.focus();
        },
        value_get: function() {
            return JSON.parse(this.select.val());
        },
        set_value: function(record, field) {
            var value = this.value_get();
            field.set_client(record, value);
        },
        set_readonly: function(readonly) {
            this.select.prop('disabled', readonly);
        }
    });

    Sao.View.Form.Boolean = Sao.class_(Sao.View.Form.Widget, {
        class_: 'form-boolean',
        init: function(field_name, model, attributes) {
            Sao.View.Form.Boolean._super.init.call(this, field_name, model,
                attributes);
            this.el = jQuery('<div/>', {
                'class': this.class_
            });
            this.group = jQuery('<div/>', {
                'class': 'input-group input-group-sm'
            }).appendTo(this.el);
            this.input = this.labelled = jQuery('<input/>', {
                'type': 'checkbox',
                'class': 'form-control input-sm'
            }).appendTo(this.group);
            this.input.change(this.focus_out.bind(this));
            this.input.click(function() {
                // Dont trigger click if field is readonly as readonly has no
                // effect on checkbox
                return !jQuery(this).prop('readonly');
            });
        },
        display: function(record, field) {
            Sao.View.Form.Boolean._super.display.call(this, record, field);
            if (record) {
                this.input.prop('checked', record.field_get(this.field_name));
            } else {
                this.input.prop('checked', false);
            }
        },
        focus: function() {
            this.input.focus();
        },
        set_value: function(record, field) {
            var value = this.input.prop('checked');
            field.set_client(record, value);
        },
        set_readonly: function(readonly) {
            this.input.prop('readonly', readonly);
        }
    });

    Sao.View.Form.Text = Sao.class_(Sao.View.Form.Widget, {
        class_: 'form-text',
        init: function(field_name, model, attributes) {
            Sao.View.Form.Text._super.init.call(this, field_name, model,
                attributes);
            this.el = jQuery('<div/>', {
                'class': this.class_
            });
            this.input = this.labelled = jQuery('<textarea/>', {
                'class': 'form-control input-sm'
            }).appendTo(this.el);
            this.input.change(this.focus_out.bind(this));
        },
        display: function(record, field) {
            Sao.View.Form.Text._super.display.call(this, record, field);
            if (record) {
                var value = record.field_get_client(this.field_name);
                this.input.val(value);
            } else {
                this.input.val('');
            }
        },
        focus: function() {
            this.input.focus();
        },
        set_value: function(record, field) {
            var value = this.input.val() || '';
            field.set_client(record, value);
        },
        set_readonly: function(readonly) {
            this.input.prop('readonly', readonly);
        }
    });

    Sao.View.Form.RichText = Sao.class_(Sao.View.Form.Widget, {
        class_: 'form-richtext',
        init: function(field_name, model, attributes) {
            var i, properties, button;
            this.is_readonly = false;
            Sao.View.Form.RichText._super.init.call(
                    this, field_name, model, attributes);
            this.el = jQuery('<div/>', {
                'class': this.class_ + ' panel panel-default'
            });
            this.header = jQuery('<div/>', {
                'class': 'panel-heading'
            }).appendTo(this.el);
            this.toolbar = jQuery('<div/>', {
                'class': 'btn-toolbar',
                'role': 'toolbar'
            }).appendTo(this.header);

            var button_apply_command = function(evt) {
                document.execCommand(evt.data);
            };

            var add_buttons = function(buttons) {
                var group = jQuery('<div/>', {
                    'class': 'btn-group',
                    'role': 'group'
                }).appendTo(this.toolbar);
                for (i in buttons) {
                    properties = buttons[i];
                    button = jQuery('<button/>', {
                        'class': 'btn btn-default',
                        'type': 'button'
                    }).append(jQuery('<span/>', {
                        'class': 'glyphicon glyphicon-' + properties.icon
                    })).appendTo(group);
                    button.click(properties.command, button_apply_command);
                }
            }.bind(this);

            add_buttons([
                    {
                        'icon': 'bold',
                        'command': 'bold'
                    }, {
                        'icon': 'italic',
                        'command': 'italic'
                    }, {
                        'icon': 'text-color',  // XXX
                        'command': 'underline'
                    }]);

            var selections = [
            {
                'heading': Sao.i18n.gettext('Font'),
                'options': ['Normal', 'Serif', 'Sans', 'Monospace'],  // XXX
                'command': 'fontname'
            }, {
                'heading': Sao.i18n.gettext('Size'),
                'options': [1, 2, 3, 4, 5, 6, 7],
                'command': 'fontsize'
            }];
            var add_option = function(dropdown, properties) {
                return function(option) {
                    dropdown.append(jQuery('<li/>').append(jQuery('<a/>', {
                        'href': '#'
                    }).append(option).click(function() {
                        document.execCommand(properties.command, false, option);
                    })));
                };
            };
            for (i in selections) {
                properties = selections[i];
                var group = jQuery('<div/>', {
                    'class': 'btn-group',
                    'role': 'group'
                }).appendTo(this.toolbar);
                button = jQuery('<button/>', {
                    'class': 'btn btn-default dropdown-toggle',
                    'type': 'button',
                    'data-toggle': 'dropdown',
                    'aria-expanded': false,
                    'aria-haspopup': true
                }).append(properties.heading)
                .append(jQuery('<span/>', {
                    'class': 'caret'
                })).appendTo(group);
                var dropdown = jQuery('<ul/>', {
                    'class': 'dropdown-menu'
                }).appendTo(group);
                properties.options.forEach(add_option(dropdown, properties));
            }

            add_buttons([
                    {
                        'icon': 'align-left',
                        'command': 'justifyLeft'
                    }, {
                        'icon': 'align-center',
                        'command': 'justifyCenter'
                    }, {
                        'icon': 'align-right',
                        'command': 'justifyRight'
                    }, {
                        'icon': 'align-justify',
                        'command': 'justifyFull'
                    }]);

            // TODO backColor
            [['foreColor', '#000000']].forEach(
                    function(e) {
                        var command = e[0];
                        var color = e[1];
                        jQuery('<input/>', {
                            'class': 'btn btn-default',
                            'type': 'color'
                        }).appendTo(this.toolbar)
                        .change(function() {
                            document.execCommand(command, false, jQuery(this).val());
                        }).focusin(function() {
                            document.execCommand(command, false, jQuery(this).val());
                        }).val(color);
            }.bind(this));

            this.input = this.labelled = jQuery('<div/>', {
                'class': 'richtext pre',
                'contenteditable': true
            }).appendTo(jQuery('<div/>', {
                'class': 'panel-body'
            }).appendTo(this.el));
            this.el.focusout(this.focus_out.bind(this));
        },
        focus_out: function() {
            // Let browser set the next focus before testing
            // if it moved out of the widget
            window.setTimeout(function() {
                if (this.el.find(':focus').length === 0) {
                    Sao.View.Form.RichText._super.focus_out.call(this);
                }
            }.bind(this), 0);
        },
        display: function(record, field) {
            Sao.View.Form.RichText._super.display.call(this, record, field);
            var value = '';
            if (record) {
                value = record.field_get_client(this.field_name);
            }
            this.input.html(value);
        },
        focus: function() {
            this.input.focus();
        },
        set_value: function(record, field) {
            // TODO order attributes
            // [Bug Sao]
            //    > don't edit the content when widget is readonly
            if (!this.is_readonly){
                this.input.find('div').each(function(i, el) {
                    el = jQuery(el);
                    // Not all browsers respect the styleWithCSS
                    if (el.css('text-align')) {
                        // Remove browser specific prefix
                        var align = el.css('text-align').split('-').pop();
                        el.attr('align', align);
                        el.css('text-align', '');
                    }
                    // Some browsers set start as default align
                    if (el.attr('align') == 'start') {
                        el.attr('align', 'left');
                    }
                });
            }
            var value = this.input.html() || '';
            field.set_client(record, value);
        },
        set_readonly: function(readonly) {
            this.is_readonly = readonly;
            this.input.prop('contenteditable', !readonly);
            this.toolbar.find('button,select').prop('disabled', readonly);
            if (!readonly){
                this.header.show();
            } else {
                this.header.hide();
            }
        }
    });

    Sao.View.Form.Many2One = Sao.class_(Sao.View.Form.Widget, {
        class_: 'form-many2one',
        init: function(field_name, model, attributes) {
            Sao.View.Form.Many2One._super.init.call(this, field_name, model,
                attributes);
            this.el = jQuery('<div/>', {
                'class': this.class_
            });
            var group = jQuery('<div/>', {
                'class': 'input-group input-group-sm'
            }).appendTo(this.el);
            this.entry = this.labelled = jQuery('<input/>', {
                'type': 'input',
                'class': 'form-control input-sm'
            }).appendTo(group);
            // Use keydown to not receive focus-in TAB
            this.entry.on('keydown', this.key_press.bind(this));

            if (!attributes.completion || attributes.completion == "1") {
                Sao.common.get_completion(group,
                    this._update_completion.bind(this),
                    this._completion_match_selected.bind(this),
                    this._completion_action_activated.bind(this));
                this.wid_completion = true;
            }

            // Append buttons after the completion to not break layout
            var buttons = jQuery('<span/>', {
                'class': 'input-group-btn'
            }).appendTo(group);
            this.but_open = jQuery('<button/>', {
                'class': 'btn btn-default',
                'type': 'button'
            }).append(jQuery('<span/>', {
                'class': 'glyphicon glyphicon-search'
            })).appendTo(buttons);
            this.but_open.click(this.edit.bind(this));

            this.el.change(this.focus_out.bind(this));
            this._readonly = false;
        },
        get_screen: function() {
            var domain = this.field().get_domain(this.record());
            var context = this.field().get_context(this.record());
            return new Sao.Screen(this.get_model(), {
                'context': context,
                'domain': domain,
                'mode': ['form'],
                'view_ids': (this.attributes.view_ids || '').split(','),
                'views_preload': this.attributes.views,
                'readonly': this._readonly
            });
        },
        set_text: function(value) {
            if (jQuery.isEmptyObject(value)) {
                value = '';
            }
            jQuery.when(value).then(function(text){
                if (text && typeof text == 'string')
                    this.entry.val(text);
            }.bind(this));
        },
        get_text: function() {
            var record = this.record();
            if (record) {
                return record.field_get_client(this.field_name);
            }
            return '';
        },
        focus_out: function() {
            if (!this.attributes.completion ||
                    this.attributes.completion == "1") {
                if (this.el.find('.dropdown').hasClass('open')) {
                    return;
                }
            }
            Sao.View.Form.Many2One._super.focus_out.call(this);
        },
        set_value: function(record, field) {
            if (field.get_client(record) != this.entry.val()) {
                field.set_client(record, this.value_from_id(null, ''));
                this.entry.val('');
            }
        },
        display: function(record, field) {
            var screen_record = this.record();
            if ((screen_record && record) && (screen_record.id != record.id)) {
                return;
            }

            var text_value, value;
            Sao.View.Form.Many2One._super.display.call(this, record, field);

            this._set_button_sensitive();
            this._set_completion();

            if (!record) {
                this.entry.val('');
                return;
            }
            this.set_text(field.get_client(record));
            value = field.get(record);
            if (this.has_target(value)) {
                this.but_open.button({
                    'icons': {
                        'primary': 'glyphicon-folder-open'
                    }});
            } else {
                this.but_open.button({
                    'icons': {
                        'primary': 'glyphicon-search'
                    }});
            }
        },
        focus: function() {
            this.entry.focus();
        },
        set_readonly: function(readonly) {
            this._readonly = readonly;
            this._set_button_sensitive();
        },
        _set_button_sensitive: function() {
            this.entry.prop('readonly', this._readonly);
            this.but_open.prop('disabled',
                    !this.read_access());
        },
        get_access: function(type) {
            var model = this.get_model();
            if (model) {
                return Sao.common.MODELACCESS.get(model)[type];
            }
            return true;
        },
        read_access: function() {
            return this.get_access('read');
        },
        create_access: function() {
            return this.attributes.create && this.get_access('create');
        },
        id_from_value: function(value) {
            return value;
        },
        value_from_id: function(id, str) {
            if (str === undefined) {
                str = '';
            }
            return [id, str];
        },
        get_model: function() {
            return this.attributes.relation;
        },
        has_target: function(value) {
            return value !== undefined && value !== null;
        },
        edit: function(evt) {
            var model = this.get_model();
            if (!model || !Sao.common.MODELACCESS.get(model).read) {
                return;
            }
            var win, callback;
            var record = this.record();
            var value = record.field_get(this.field_name);
            if (model && this.has_target(value)) {
                var screen = this.get_screen();
                var m2o_id =
                    this.id_from_value(record.field_get(this.field_name));
                screen.new_group([m2o_id]);
                callback = function(result) {
                    if (result) {
                        var rec_name_prm = screen.current_record.rec_name();
                        rec_name_prm.done(function(name) {
                            var value = this.value_from_id(
                                screen.current_record.id, name);
                            this.record().field_set_client(this.field_name,
                                value, true);
                        }.bind(this));
                    }
                };
                win = new Sao.Window.Form(screen, callback.bind(this), {
                    save_current: true
                });
            } else if (model && !this._readonly) {
                var dom;
                var domain = this.field().get_domain(record);
                var context = this.field().get_context(record);
                var text = this.entry.val();
                callback = function(result) {
                    if (!jQuery.isEmptyObject(result)) {
                        var value = this.value_from_id(result[0][0],
                                result[0][1]);
                        this.record().field_set_client(this.field_name,
                                value, true);
                    }
                };
                var parser = new Sao.common.DomainParser();
                win = new Sao.Window.Search(model,
                        callback.bind(this), {
                            sel_multi: false,
                            context: context,
                            domain: domain,
                            view_ids: (this.attributes.view_ids ||
                                '').split(','),
                            views_preload: (this.attributes.views || {}),
                            new_: this.create_access(),
                            search_filter: parser.quote(text)
                        });
            }
        },
        new_: function(evt) {
            var model = this.get_model();
            if (!model || ! Sao.common.MODELACCESS.get(model).create) {
                return;
            }
            var screen = this.get_screen();
            var callback = function(result) {
                if (result) {
                    var rec_name_prm = screen.current_record.rec_name();
                    rec_name_prm.done(function(name) {
                        var value = this.value_from_id(
                            screen.current_record.id, name);
                        this.record().field_set_client(this.field_name, value);
                    }.bind(this));
                }
            };
            var win = new Sao.Window.Form(screen, callback.bind(this), {
                new_: true,
                save_current: true
            });
        },
        key_press: function(event_) {
            var editable = !this.entry.prop('readonly');
            var activate_keys = [Sao.common.TAB_KEYCODE];
            var delete_keys = [Sao.common.BACKSPACE_KEYCODE,
                Sao.common.DELETE_KEYCODE];
            if (!this.wid_completion) {
                activate_keys.push(Sao.common.RETURN_KEYCODE);
            }

            if (event_.which == Sao.common.F3_KEYCODE &&
                    editable &&
                    this.create_access()) {
                this.new_();
                event_.preventDefault();
            } else if (event_.which == Sao.common.F2_KEYCODE &&
                    this.read_access()) {
                this.edit();
                event_.preventDefault();
            } else if (~activate_keys.indexOf(event_.which) && editable) {
                if (!this.attributes.completion ||
                        this.attributes.completion == "1") {
                    if (this.el.find('.dropdown').hasClass('open')) {
                        return;
                    }
                }
                this.activate();
            } else if (this.has_target(this.record().field_get(
                            this.field_name)) && editable) {
                var value = this.get_text();
                if ((value != this.entry.val()) ||
                        ~delete_keys.indexOf(event_.which)) {
                    this.entry.val('');
                    this.record().field_set_client(this.field_name,
                        this.value_from_id(null, ''));
                }
            }
        },
        activate: function() {
            var model = this.get_model();
            if (!model || !Sao.common.MODELACCESS.get(model).read) {
                return;
            }
            var record = this.record();
            var value = record.field_get(this.field_name);
            var sao_model = new Sao.Model(model);

            if (model && !this.has_target(value)) {
                var text = this.entry.val();
                if (!this._readonly && (text ||
                            this.field().get_state_attrs(this.record())
                            .required)) {
                    var dom;
                    var domain = this.field().get_domain(record);
                    var context = this.field().get_context(record);

                    var callback = function(result) {
                        if (!jQuery.isEmptyObject(result)) {
                            var value = this.value_from_id(result[0][0],
                                result[0][1]);
                            this.record().field_set_client(this.field_name,
                                value, true);
                        } else {
                            this.entry.val('');
                        }
                    };
                    var parser = new Sao.common.DomainParser();
                    var win = new Sao.Window.Search(model,
                            callback.bind(this), {
                                sel_multi: false,
                                context: context,
                                domain: domain,
                                view_ids: (this.attributes.view_ids ||
                                    '').split(','),
                                views_preload: (this.attributes.views ||
                                    {}),
                                new_: this.create_access(),
                                search_filter: parser.quote(text)
                            });
                }
            }
        },
        _set_completion: function() {
            var search = this.el.find('.action-search');
            if (this.read_access()) {
                search.removeClass('disabled');
            } else {
                search.addClass('disabled');
            }
            var create = this.el.find('.action-create');
            if (this.create_access()) {
                create.removeClass('disabled');
            } else {
                create.addClass('disabled');
            }
        },
        _update_completion: function(text) {
            var record = this.record();
            if (!record) {
                return;
            }
            var field = this.field();
            var value = field.get(record);
            if (this.has_target(value)) {
                var id = this.id_from_value(value);
                if ((id !== undefined) && (id > 0)) {
                    return jQuery.when();
                }
            }
            var model = this.get_model();

            return Sao.common.update_completion(
                    this.entry, record, field, model);
        },
        _completion_match_selected: function(value) {
            this.record().field_set_client(this.field_name,
                    this.value_from_id(
                        value.id, value.rec_name), true);
        },
        _completion_action_activated: function(action) {
            if (action == 'search') {
                this.edit();
            } else if (action == 'create') {
                this.new_();
            }
        }
    });

    Sao.View.Form.One2One = Sao.class_(Sao.View.Form.Many2One, {
        class_: 'form-one2one'
    });

    Sao.View.Form.Reference = Sao.class_(Sao.View.Form.Many2One, {
        class_: 'form-reference',
        init: function(field_name, model, attributes) {
            Sao.View.Form.Reference._super.init.call(this, field_name, model,
                attributes);
            this.el.addClass('form-inline');
            this.select = jQuery('<select/>', {
                'class': 'form-control input-sm',
                'aria-label': attributes.string
            });
            this.el.prepend(jQuery('<span/>').text('-'));
            this.el.prepend(this.select);
            this.select.change(this.select_changed.bind(this));
            Sao.common.selection_mixin.init.call(this);
            this.init_selection();
        },
        init_selection: function(key) {
            Sao.common.selection_mixin.init_selection.call(this, key,
                this.set_selection.bind(this));
        },
        update_selection: function(record, field, callback) {
            Sao.common.selection_mixin.update_selection.call(this, record,
                field, function(selection) {
                    this.set_selection(selection);
                    if (callback) {
                        callback();
                    }
                }.bind(this));
        },
        set_selection: function(selection) {
            var select = this.select;
            select.empty();
            selection.forEach(function(e) {
                select.append(jQuery('<option/>', {
                    'value': e[0],
                    'text': e[1]
                }));
            });
        },
        id_from_value: function(value) {
            return parseInt(value.split(',')[1], 10);
        },
        value_from_id: function(id, str) {
            if (!str) {
                str = '';
            }
            return [this.get_model(), [id, str]];
        },
        get_text: function() {
            var record = this.record();
            if (record) {
                return record.field_get_client(this.field_name)[1];
            }
            return '';
        },
        get_model: function() {
            return this.select.val();
        },
        has_target: function(value) {
            if (value === null) {
                return false;
            }
            var model = value.split(',')[0];
            value = value.split(',')[1];
            if (jQuery.isEmptyObject(value)) {
                value = null;
            } else {
                value = parseInt(value, 10);
                if (isNaN(value)) {
                    value = null;
                }
            }
            return (model == this.get_model()) && (value >= 0);
        },
        _set_button_sensitive: function() {
            Sao.View.Form.Reference._super._set_button_sensitive.call(this);
            this.select.prop('disabled', this.entry.prop('readonly'));
        },
        select_changed: function() {
            this.entry.val('');
            var model = this.get_model();
            var value;
            if (model) {
                value = [model, [-1, '']];
            } else {
                value = ['', ''];
            }
            this.record().field_set_client(this.field_name, value);
        },
        set_value: function(record, field) {
            var value;
            if (!this.get_model()) {
                value = this.entry.val();
                if (jQuery.isEmptyObject(value)) {
                    field.set_client(record, null);
                } else {
                    field.set_client(record, ['', value]);
                }
            } else {
                value = field.get_client(record, this.field_name);
                var model, name;
                if (value instanceof Array) {
                    model = value[0];
                    name = value[1];
                } else {
                    model = '';
                    name = '';
                }
                if ((model != this.get_model()) ||
                        (name != this.entry.val())) {
                    field.set_client(record, null);
                    this.entry.val('');
                }
            }
        },
        set_text: function(value) {
            var model;
            if (value) {
                model = value[0];
                value = value[1];
            } else {
                model = null;
                value = null;
            }
            Sao.View.Form.Reference._super.set_text.call(this, value);
            if (model) {
                this.select.val(model);
            } else {
                this.select.val('');
            }
        },
        display: function(record, field) {
            this.update_selection(record, field, function() {
                Sao.View.Form.Reference._super.display.call(this, record, field);
            }.bind(this));
        },
        set_readonly: function(readonly) {
            Sao.View.Form.Reference._super.set_readonly.call(this, readonly);
            this.select.prop('disabled', readonly);
        }
    });

    Sao.View.Form.One2Many = Sao.class_(Sao.View.Form.Widget, {
        class_: 'form-one2many',
        init: function(field_name, model, attributes) {
            Sao.View.Form.One2Many._super.init.call(this, field_name, model,
                attributes);

            this._readonly = true;

            this.el = jQuery('<div/>', {
                'class': this.class_ + ' panel panel-default'
            });
            this.menu = jQuery('<div/>', {
                'class': this.class_ + '-menu panel-heading'
            });
            this.el.append(this.menu);

            var label = jQuery('<label/>', {
                'class': this.class_ + '-string',
                text: attributes.string
            });
            this.menu.append(label);

            label.uniqueId();
            this.el.uniqueId();
            this.el.attr('aria-labelledby', label.attr('id'));
            label.attr('for', this.el.attr('id'));

            var toolbar = jQuery('<div/>', {
                'class': this.class_ + '-toolbar'
            });
            this.menu.append(toolbar);

            var group = jQuery('<div/>', {
                'class': 'input-group input-group-sm'
            }).appendTo(toolbar);

            this.wid_text = jQuery('<input/>', {
                type: 'text',
                'class': 'form-control input-sm'
            }).appendTo(group);
            this.wid_text.hide();

            var buttons = jQuery('<div/>', {
                'class': 'input-group-btn'
            }).appendTo(group);

            if (attributes.add_remove) {
                this.wid_text.show();
                // TODO add completion
                //
                this.but_add = jQuery('<button/>', {
                    'class': 'btn btn-default btn-sm',
                    'type': 'button',
                    'aria-label': Sao.i18n.gettext('Add')
                }).append(jQuery('<span/>', {
                    'class': 'glyphicon glyphicon-plus'
                })).appendTo(buttons);
                this.but_add.click(this.add.bind(this));

                this.but_remove = jQuery('<button/>', {
                    'class': 'btn btn-default btn-sm',
                    'type': 'button',
                    'aria-label': Sao.i18n.gettext('Remove')
                }).append(jQuery('<span/>', {
                    'class': 'glyphicon glyphicon-minus'
                })).appendTo(buttons);
                this.but_remove.click(this.remove.bind(this));
            }

            this.but_new = jQuery('<button/>', {
                'class': 'btn btn-default btn-sm',
                'type': 'button',
                'aria-label': Sao.i18n.gettext('New')
            }).append(jQuery('<span/>', {
                'class': 'glyphicon glyphicon-edit'
            })).appendTo(buttons);
            this.but_new.click(this.new_.bind(this));

            this.but_open = jQuery('<button/>', {
                'class': 'btn btn-default btn-sm',
                'type': 'button',
                'aria-label': Sao.i18n.gettext('Open')
            }).append(jQuery('<span/>', {
                'class': 'glyphicon glyphicon-folder-open'
            })).appendTo(buttons);
            this.but_open.click(this.open.bind(this));

            this.but_del = jQuery('<button/>', {
                'class': 'btn btn-default btn-sm',
                'type': 'button',
                'aria-label': Sao.i18n.gettext('Delete')
            }).append(jQuery('<span/>', {
                'class': 'glyphicon glyphicon-trash'
            })).appendTo(buttons);
            this.but_del.click(this.delete_.bind(this));

            this.but_undel = jQuery('<button/>', {
                'class': 'btn btn-default btn-sm',
                'type': 'button',
                'aria-label': Sao.i18n.gettext('Undelete')
            }).append(jQuery('<span/>', {
                'class': 'glyphicon glyphicon-repeat'
            })).appendTo(buttons);
            this.but_undel.click(this.undelete.bind(this));

            this.but_previous = jQuery('<button/>', {
                'class': 'btn btn-default btn-sm',
                'type': 'button',
                'aria-label': Sao.i18n.gettext('Previous')
            }).append(jQuery('<span/>', {
                'class': 'glyphicon glyphicon-chevron-left'
            })).appendTo(buttons);
            this.but_previous.click(this.previous.bind(this));

            this.label = jQuery('<span/>', {
                'class': 'btn'
            }).appendTo(buttons);
            this.label.text('(0, 0)');

            this.but_next = jQuery('<button/>', {
                'class': 'btn btn-default btn-sm',
                'type': 'button',
                'aria-label': Sao.i18n.gettext('Next')
            }).append(jQuery('<span/>', {
                'class': 'glyphicon glyphicon-chevron-right'
            })).appendTo(buttons);
            this.but_next.click(this.next.bind(this));

            this.but_switch = jQuery('<button/>', {
                'class': 'btn btn-default btn-sm',
                'type': 'button',
                'aria-label': Sao.i18n.gettext('Switch')
            }).append(jQuery('<span/>', {
                'class': 'glyphicon glyphicon-list-alt'
            })).appendTo(buttons);
            this.but_switch.click(this.switch_.bind(this));

            // [Coog specific]
            //      > attribute expand_toolbar (hide toolbar)
            if (attributes.expand_toolbar)
                this.menu.hide();

            this.content = jQuery('<div/>', {
                'class': this.class_ + '-content panel-body'
            });
            this.el.append(this.content);

            var modes = (attributes.mode || 'tree,form').split(',');
            this.screen = new Sao.Screen(attributes.relation, {
                mode: modes,
                view_ids: (attributes.view_ids || '').split(','),
                views_preload: attributes.views || {},
                row_activate: this.activate.bind(this),
                readonly: attributes.readonly || false,
                exclude_field: attributes.relation_field || null,
                pre_validate: attributes.pre_validate
            });
            if (attributes.group)
                this.screen.parent = this;
            this.screen.pre_validate = attributes.pre_validate == 1;
            this.prm = this.screen.switch_view(modes[0]).done(function() {
                this.content.append(this.screen.screen_container.el);
            }.bind(this));

            // TODO key_press

            this.but_switch.prop('disabled', this.screen.number_of_views() <= 0);
        },
        // [Coog specific] multi_mixed_view
        group_sync: function(screen, current_record){
            if (this.attributes.mode == 'form')
                return;
            if (!this.view || !this.view.widgets)
                return;

            function is_compatible(screen, record){
                if (screen.current_view === undefined)
                    return false;

                return (!(screen.current_view.view_type == 'form' &&
                    record !== undefined &&
                    screen.model_name != record.model.name));
            }

            var key;
            var record;
            var widget;
            var widgets = this.view.widgets[this.field_name];
            var to_sync = [];

            for (var j = 0; j < widgets.length; j++){
                widget = widgets[j];
                if (!widget.hasOwnProperty('attributes')){
                    return;
                }

                if (widget == this ||
                    widget.attributes.group != this.attributes.group ||
                    !widget.hasOwnProperty('screen')){
                    continue;
                }

                if (widget.screen.current_record == current_record){
                    continue;
                }

                record = current_record;
                if (!is_compatible(widget.screen, record))
                    record = null;
                if (!widget.validate())
                    return;

                to_sync.push({'widget': widget, 'record': record});
            }
            widget = null;
            var to_display = null;

            for (var i = 0; i < to_sync.length; i++){
                widget = to_sync[i].widget;
                record = to_sync[i].record;

                if (widget.screen.current_view === undefined)
                    continue;

                if (widget.screen.current_view.view_type == 'form' &&
                    record !== undefined && record !== null &&
                    widget.screen.group.model.name == record.group.model.name){
                    var fields = widget.screen.group.model.fields;
                    var ret = [];
                    for(var name in fields){
                        ret[name] = fields[name].description;
                    }
                    record.group.model.add_fields(ret);
                }

                widget.screen.current_record = record;
                widget.display(widget.record(), widget.field());
                if (record){
                    to_display = widget;
                }
            }
            if (widget){
                for (j in widget.view.containers) {
                    var container = widget.view.containers[j];
                    container.resize();
                }
            }
            if (to_display) {
                to_display.display(to_display.record(), to_display.field());
            }
        },
        set_readonly: function(readonly) {
            this._readonly = readonly;
            this._set_button_sensitive();
        },
        _set_button_sensitive: function() {
            var access = Sao.common.MODELACCESS.get(this.screen.model_name);
            var size_limit, o2m_size;
            var record = this.record();
            var field = this.field();
            if (record && field) {
                var field_size = record.expr_eval(this.attributes.size);
                o2m_size = field.get_eval(record);
                size_limit = (((field_size !== undefined) &&
                            (field_size !== null)) &&
                        (o2m_size >= field_size >= 0));
            } else {
                o2m_size = null;
                size_limit = false;
            }
            var create = this.attributes.create;
            if (create === undefined) {
                create = true;
            }
            this.but_new.prop('disabled', this._readonly || !create ||
                    size_limit || !access.create);

            var delete_ = this.attributes['delete'];
            if (delete_ === undefined) {
                delete_ = true;
            }
            // TODO position
            this.but_del.prop('disabled', this._readonly || !delete_ ||
                    !access['delete']);
            this.but_undel.prop('disabled', this._readonly || size_limit);
            this.but_open.prop('disabled', !access.read);
            // TODO but_next, but_previous
            if (this.attributes.add_remove) {
                this.wid_text.prop('disabled', this._readonly);
                this.but_add.prop('disabled', this._readonly || size_limit ||
                        !access.write || !access.read);
                this.but_remove.prop('disabled', this._readonly ||
                        !access.write || !access.read);
            }
        },
        display: function(record, field) {
            Sao.View.Form.One2Many._super.display.call(this, record, field);

            this._set_button_sensitive();

            this.prm.done(function() {
                if (!record) {
                    return;
                }
                if (field === undefined) {
                    this.screen.new_group();
                    this.screen.set_current_record(null);
                    this.screen.group.parent = null;
                    this.screen.display();
                    return;
                }

                var new_group = record.field_get_client(this.field_name);

                // [Coog specific] multi_mixed_view
                if (this.attributes.group && this.attributes.mode == 'form'){
                    if (!this.screen.current_record)
                        this.set_invisible(true);
                }else if (new_group && new_group != this.screen.group) {
                    this.screen.set_group(new_group);
                    if ((this.screen.current_view.view_type == 'tree') &&
                            this.screen.current_view.editable) {
                        this.screen.set_current_record(null);
                    }
                }
                var readonly = false;
                var domain = [];
                var size_limit = null;
                if (record) {
                    readonly = field.get_state_attrs(record).readonly;
                    domain = field.get_domain(record);
                    size_limit = record.expr_eval(this.attributes.size);
                }
                if (!Sao.common.compare(this.screen.domain, domain)) {
                    this.screen.domain = domain;
                }
                this.screen.group.set_readonly(readonly);
                this.screen.size_limit = size_limit;
                this.screen.display();
            }.bind(this));
        },
        focus: function() {
            if (this.wid_text.is(':visible')) {
                this.wid_text.focus();
            }
        },
        activate: function(event_) {
            this.edit();
        },
        add: function(event_) {
            var access = Sao.common.MODELACCESS.get(this.screen.model_name);
            if (!access.write || !access.read) {
                return;
            }
            // this.view.set_value();
            var domain = this.field().get_domain(this.record());
            var context = this.field().get_context(this.record());
            domain = [domain,
                this.record().expr_eval(this.attributes.add_remove)];
            var removed_ids = this.field().get_removed_ids(this.record());
            domain = ['OR', domain, ['id', 'in', removed_ids]];
            var text = this.wid_text.val();

            // TODO sequence

            var callback = function(result) {
                var prm = jQuery.when();
                if (!jQuery.isEmptyObject(result)) {
                    var ids = [];
                    var i, len;
                    for (i = 0, len = result.length; i < len; i++) {
                        ids.push(result[i][0]);
                    }
                    this.screen.group.load(ids, true);
                    prm = this.screen.display();
                }
                prm.done(function() {
                    this.screen.set_cursor();
                }.bind(this));
                this.wid_text.val('');
            }.bind(this);
            var parser = new Sao.common.DomainParser();
            var win = new Sao.Window.Search(this.attributes.relation,
                    callback, {
                        sel_multi: true,
                        context: context,
                        domain: domain,
                        view_ids: (this.attributes.view_ids ||
                                '').split(','),
                        views_preload: this.attributes.views || {},
                        new_: !this.but_new.prop('disabled'),
                        search_filter: parser.quote(text)
                    });
        },
        remove: function(event_) {
            var access = Sao.common.MODELACCESS.get(this.screen.model_name);
            if (!access.write || !access.read) {
                return;
            }
            this.screen.remove(false, true, false);
        },
        new_: function(event_) {
            if (!Sao.common.MODELACCESS.get(this.screen.model_name).create) {
                return;
            }
            this.validate().done(function() {
                if (this.attributes.product) {
                    this.new_product();
                } else {
                    this.new_single();
                }
            }.bind(this));
        },
        new_single: function() {
            var context = jQuery.extend({},
                    this.field().get_context(this.record()));
            // TODO sequence
            if (this.screen.current_view.type == 'form' ||
                    this.screen.current_view.editable) {
                this.screen.new_();
                this.screen.current_view.el.prop('disabled', false);
            } else {
                var record = this.record();
                var field_size = record.expr_eval(
                    this.attributes.size) || -1;
                field_size -= this.field().get_eval(record);
                var win = new Sao.Window.Form(this.screen, function() {}, {
                    new_: true,
                    many: field_size,
                    context: context
                });
            }
        },
        new_product: function() {
            var fields = this.attributes.product.split(',');
            var product = {};
            var screen = this.screen;

            screen.new_(false).then(function(first) {
                first.default_get().then(function(default_) {
                    first.set_default(default_);

                    var search_set = function() {
                        if (jQuery.isEmptyObject(fields)) {
                            return make_product();
                        }
                        var field = screen.model.fields[fields.pop()];
                        var relation = field.description.relation;
                        if (!relation) {
                            search_set();
                        }

                        var domain = field.get_domain(first);
                        var context = field.get_context(first);

                        var callback = function(result) {
                            if (!jQuery.isEmptyObject(result)) {
                                product[field.name] = result;
                            }
                            search_set();
                        };
                        var win_search = new Sao.Window.Search(relation,
                                callback, {
                                    sel_multi: true,
                                    context: context,
                                    domain: domain,
                                    search_filter: ''
                        });
                    };

                    var make_product = function() {
                        if (jQuery.isEmptyObject(product)) {
                            screen.group.remove(first, true);
                            return;
                        }

                        var fields = Object.keys(product);
                        var values = fields.map(function(field) {
                            return product[field];
                        });
                        Sao.common.product(values).forEach(function(values) {
                            var set_default = function(record) {
                                var default_value = jQuery.extend({}, default_);
                                fields.forEach(function(field, i) {
                                    default_value[field] = values[i][0];
                                    default_value[field + '.rec_name'] = values[i][1];
                                });
                                record.set_default(default_value);
                            };

                            var record;
                            if (first) {
                                set_default(first);
                                first = null;
                            } else {
                                screen.new_(false).then(set_default);
                            }
                        });
                    };

                    search_set();
                });
            });
        },
        open: function(event_) {
            this.edit();
        },
        delete_: function(event_) {
            if (!Sao.common.MODELACCESS.get(this.screen.model_name)['delete']) {
                return;
            }
            this.screen.remove(false, false, false);
        },
        undelete: function(event_) {
            this.screen.unremove();
        },
        previous: function(event_) {
            this.validate().done(function() {
                this.screen.display_previous();
            }.bind(this));
        },
        next: function(event_) {
            this.validate().done(function() {
                this.screen.display_next();
            }.bind(this));
        },
        switch_: function(event_) {
            this.screen.switch_view();
        },
        edit: function() {
            if (!Sao.common.MODELACCESS.get(this.screen.model_name).read) {
                return;
            }
            this.validate().done(function() {
                var record = this.screen.current_record;
                if (record) {
                    var win = new Sao.Window.Form(this.screen, function() {});
                }
            }.bind(this));
        },
        validate: function() {
            var prm = jQuery.Deferred();
            // this.view.set_value();
            var record = this.screen.current_record;
            if (record) {
                var fields = this.screen.current_view.get_fields();
                record.validate(fields).then(function(validate) {
                    if (!validate) {
                        this.screen.display(true);
                        prm.reject();
                        return;
                    }
                    if (this.screen.pre_validate) {
                        return record.pre_validate().then(function(validate) {
                            if (!validate) {
                                prm.reject();
                                return;
                            }
                            prm.resolve();
                        });
                    }
                    prm.resolve();
                }.bind(this));
            } else {
                prm.resolve();
            }
            return prm;
        },
        set_value: function(record, field) {
            if (this.screen.current_view.view_type == 'form' &&
                this.attributes.group &&
                this.screen.model.name != record.model.name)
                return;
            this.screen.save_tree_state();
        }
    });

    Sao.View.Form.Many2Many = Sao.class_(Sao.View.Form.Widget, {
        class_: 'form-many2many',
        init: function(field_name, model, attributes) {
            Sao.View.Form.Many2Many._super.init.call(this, field_name, model,
                attributes);

            this._readonly = true;

            this.el = jQuery('<div/>', {
                'class': this.class_ + ' panel panel-default'
            });
            this.menu = jQuery('<div/>', {
                'class': this.class_ + '-menu panel-heading'
            });
            this.el.append(this.menu);

            var label = jQuery('<label/>', {
                'class': this.class_ + '-string',
                text: attributes.string
            });
            this.menu.append(label);

            label.uniqueId();
            this.el.uniqueId();
            this.el.attr('aria-labelledby', label.attr('id'));
            label.attr('for', this.el.attr('id'));

            var toolbar = jQuery('<div/>', {
                'class': this.class_ + '-toolbar'
            });
            this.menu.append(toolbar);

            var group = jQuery('<div/>', {
                'class': 'input-group input-group-sm'
            }).appendTo(toolbar);
            this.entry = jQuery('<input/>', {
                type: 'text',
                'class': 'form-control input-sm'
            }).appendTo(group);
            // Use keydown to not receive focus-in TAB
            this.entry.on('keydown', this.key_press.bind(this));

            // TODO completion

            var buttons = jQuery('<div/>', {
                'class': 'input-group-btn'
            }).appendTo(group);
            this.but_add = jQuery('<button/>', {
                'class': 'btn btn-default btn-sm',
                'type': 'button',
                'aria-label': Sao.i18n.gettext('Add')
            }).append(jQuery('<span/>', {
                'class': 'glyphicon glyphicon-plus'
            })).appendTo(buttons);
            this.but_add.click(this.add.bind(this));

            this.but_remove = jQuery('<button/>', {
                'class': 'btn btn-default btn-sm',
                'type': 'button',
                'aria-label': Sao.i18n.gettext('Remove')
            }).append(jQuery('<span/>', {
                'class': 'glyphicon glyphicon-minus'
            })).appendTo(buttons);
            this.but_remove.click(this.remove.bind(this));

            if (attributes.expand_toolbar)
                this.menu.hide();

            this.content = jQuery('<div/>', {
                'class': this.class_ + '-content panel-body'
            });
            this.el.append(this.content);

            this.screen = new Sao.Screen(attributes.relation, {
                mode: ['tree'],
                view_ids: (attributes.view_ids || '').split(','),
                views_preload: attributes.views || {},
                row_activate: this.activate.bind(this)
            });
            this.prm = this.screen.switch_view('tree').done(function() {
                this.content.append(this.screen.screen_container.el);
            }.bind(this));
        },
        set_readonly: function(readonly) {
            this._readonly = readonly;
            this._set_button_sensitive();
        },
        _set_button_sensitive: function() {
            var size_limit = false;
            if (this.record() && this.field()) {
                // TODO
            }

            this.entry.prop('disabled', this._readonly);
            this.but_add.prop('disabled', this._readonly || size_limit);
            // TODO position
            this.but_remove.prop('disabled', this._readonly);
        },
        display: function(record, field) {
            Sao.View.Form.Many2Many._super.display.call(this, record, field);

            this.prm.done(function() {
                if (!record) {
                    return;
                }
                if (field === undefined) {
                    this.screen.new_group();
                    this.screen.set_current_record(null);
                    this.screen.group.parent = null;
                    this.screen.display();
                    return;
                }
                var new_group = record.field_get_client(this.field_name);
                if (new_group != this.screen.group) {
                    this.screen.set_group(new_group);
                }
                this.screen.display();
            }.bind(this));
        },
        focus: function() {
            this.entry.focus();
        },
        activate: function() {
            this.edit();
        },
        add: function() {
            var dom;
            var domain = this.field().get_domain(this.record());
            var context = this.field().get_context(this.record());
            var value = this.entry.val();

            var callback = function(result) {
                if (!jQuery.isEmptyObject(result)) {
                    var ids = [];
                    var i, len;
                    for (i = 0, len = result.length; i < len; i++) {
                        ids.push(result[i][0]);
                    }
                    this.screen.group.load(ids, true);
                    this.screen.display();
                }
                this.entry.val('');
            }.bind(this);
            var parser = new Sao.common.DomainParser();
            var win = new Sao.Window.Search(this.attributes.relation,
                    callback, {
                        sel_multi: true,
                        context: context,
                        domain: domain,
                        view_ids: (this.attributes.view_ids ||
                            '').split(','),
                        views_preload: this.attributes.views || {},
                        new_: this.attributes.create,
                        search_filter: parser.quote(value)
                    });
        },
        remove: function() {
            this.screen.remove(false, true, false);
        },
        key_press: function(event_) {
            var activate_keys = [Sao.common.TAB_KEYCODE];
            if (!this.wid_completion) {
                activate_keys.push(Sao.common.RETURN_KEYCODE);
            }

            if (event_.which == Sao.common.F3_KEYCODE) {
                this.new_();
                event_.preventDefault();
            } else if (event_.which == Sao.common.F2_KEYCODE) {
                this.add();
                event_.preventDefault();
            } else if (~activate_keys.indexOf(event_.which) && this.entry.val()) {
                this.add();
            }
        },
        edit: function() {
            if (jQuery.isEmptyObject(this.screen.current_record)) {
                return;
            }
            // Create a new screen that is not linked to the parent otherwise
            // on the save of the record will trigger the save of the parent
            var domain = this.field().get_domain(this.record());
            var add_remove = this.record().expr_eval(
                    this.attributes.add_remove);
            if (!jQuery.isEmptyObject(add_remove)) {
                domain = [domain, add_remove];
            }
            var context = this.field().get_context(this.record());
            var screen = new Sao.Screen(this.attributes.relation, {
                'domain': domain,
                'view_ids': (this.attributes.view_ids || '').split(','),
                'mode': ['form'],
                'views_preload': this.attributes.views,
                'readonly': this.attributes.readonly || false,
                'context': context
            });
            screen.new_group([this.screen.current_record.id]);
            var callback = function(result) {
                if (result) {
                    screen.current_record.save().done(function() {
                        // Force a reload on next display
                        this.screen.current_record.cancel();
                    }.bind(this));
                }
            }.bind(this);
            screen.switch_view().done(function() {
                new Sao.Window.Form(screen, callback);
            });
        },
        new_: function() {
            var domain = this.field().get_domain(this.record());
            var add_remove = this.record().expr_eval(
                    this.attributes.add_remove);
            if (!jQuery.isEmptyObject(add_remove)) {
                domain = [domain, add_remove];
            }
            var context = this.field().get_context(this.record());

            var screen = new Sao.Screen(this.attributes.relation, {
                'domain': domain,
                'view_ids': (this.attributes.view_ids || '').split(','),
                'mode': ['form'],
                'views_preload': this.attributes.views,
                'context': context
            });
            var callback = function(result) {
                if (result) {
                    var record = screen.current_record;
                    this.screen.group.load([record.id], true);
                }
                this.entry.val('');
            }.bind(this);
            screen.switch_view().done(function() {
                new Sao.Window.Form(screen, callback, {
                    'new_': true,
                    'save_current': true
                });
            });
        }
    });

    Sao.View.Form.BinaryMixin = Sao.class_(Sao.View.Form.Widget, {
        init: function(field_name, model, attributes) {
            Sao.View.Form.BinaryMixin._super.init.call(
                    this, field_name, model, attributes);
            this.filename = attributes.filename || null;
        },
        toolbar: function(class_) {
            var group = jQuery('<div/>', {
                'class': class_,
                'role': 'group'
            });

            this.but_select = jQuery('<button/>', {
                'class': 'btn btn-default',
                'type': 'button'
            }).append(jQuery('<span/>', {
                'class': 'glyphicon glyphicon-search'
            })).appendTo(group);
            this.but_select.click(this.select.bind(this));

            if (this.filename) {
                this.but_open = jQuery('<button/>', {
                    'class': 'btn btn-default',
                    'type': 'button'
                }).append(jQuery('<span/>', {
                    'class': 'glyphicon glyphicon-folder-open'
                })).appendTo(group);
                this.but_open.click(this.open.bind(this));
            }

            this.but_save_as = jQuery('<button/>', {
                'class': 'btn btn-default',
                'type': 'button'
            }).append(jQuery('<span/>', {
                'class': 'glyphicon glyphicon-save'
            })).appendTo(group);
            this.but_save_as.click(this.save_as.bind(this));

            this.but_clear = jQuery('<button/>', {
                'class': 'btn btn-default',
                'type': 'button'
            }).append(jQuery('<span/>', {
                'class': 'glyphicon glyphicon-erase'
            })).appendTo(group);
            this.but_clear.click(this.clear.bind(this));

            return group;
        },
        filename_field: function() {
            var record = this.record();
            if (record) {
                return record.model.fields[this.filename];
            }
        },
        select: function() {
            var record = this.record();

            var close = function() {
                file_dialog.modal.on('hidden.bs.modal', function(event) {
                    jQuery(this).remove();
                });
                file_dialog.modal.modal('hide');
            };

            var save_file = function() {
                var reader = new FileReader();
                reader.onload = function(evt) {
                    var uint_array = new Uint8Array(reader.result);
                    this.field().set_client(record, uint_array);
                }.bind(this);
                reader.onloadend = function(evt) {
                    close();
                };
                var file = file_selector[0].files[0];
                reader.readAsArrayBuffer(file);
                if (this.filename) {
                    this.filename_field().set_client(record, file.name);
                }
            }.bind(this);

            var file_dialog = new Sao.Dialog(
                    Sao.i18n.gettext('Select'), 'file-dialog');
            file_dialog.footer.append(jQuery('<button/>', {
                'class': 'btn btn-link',
                'type': 'button'
            }).append(Sao.i18n.gettext('Cancel')).click(close))
            .append(jQuery('<button/>', {
                'class': 'btn btn-primary',
                'type': 'submit'
            }).append(Sao.i18n.gettext('OK')).click(save_file));
            file_dialog.content.submit(function(e) {
                save_file();
                e.preventDefault();
            });

            var file_selector = jQuery('<input/>', {
                type: 'file'
            }).appendTo(file_dialog.body);

            file_dialog.modal.modal('show');
        },
        open: function() {
            // TODO find a way to make the difference
            // between downloading and opening
            this.save_as();
        },
        save_as: function() {
            var field = this.field();
            var record = this.record();
            field.get_data(record).done(function(data) {
                var blob = new Blob([data],
                        {type: 'application/octet-binary'});
                var blob_url = window.URL.createObjectURL(blob);
                if (this.blob_url) {
                    window.URL.revokeObjectURL(this.blob_url);
                }
                this.blob_url = blob_url;
                window.open(blob_url);
            }.bind(this));
        },
        clear: function() {
            this.field().set_client(this.record(), null);
        }
    });

    Sao.View.Form.Binary = Sao.class_(Sao.View.Form.BinaryMixin, {
        class_: 'form-binary',
        blob_url: '',
        init: function(field_name, model, attributes) {
            Sao.View.Form.Binary._super.init.call(this, field_name, model,
                attributes);

            this.el = jQuery('<div/>', {
                'class': this.class_
            });

            if (this.filename && attributes.filename_visible) {
                this.text = jQuery('<input/>', {
                    type: 'input',
                    'class': 'form-control input-sm'
                }).appendTo(this.el);
                this.text.change(this.focus_out.bind(this));
                // Use keydown to not receive focus-in TAB
                this.text.on('keydown', this.key_press.bind(this));
            }

            var group = jQuery('<div/>', {
                'class': 'input-group input-group-sm'
            }).appendTo(this.el);
            this.size = jQuery('<input/>', {
                type: 'input',
                'class': 'form-control input-sm'
            }).appendTo(group);

            this.toolbar('input-group-btn').appendTo(group);
        },
        display: function(record, field) {
            Sao.View.Form.Binary._super.display.call(this, record, field);
            if (!field) {
                this.size.val('');
                if (this.filename) {
                    this.but_open.button('disable');
                }
                if (this.text) {
                    this.text.val('');
                }
                this.but_save_as.button('disable');
                return;
            }
            var size = field.get_size(record);
            var button_sensitive;
            if (size) {
                button_sensitive = 'enable';
            } else {
                button_sensitive = 'disable';
            }

            if (this.filename) {
                if (this.text) {
                    this.text.val(this.filename_field().get(record) || '');
                }
                this.but_open.button(button_sensitive);
            }
            this.size.val(Sao.common.humanize(size));
            this.but_save_as.button(button_sensitive);
        },
        key_press: function(evt) {
            var editable = !this.wid_text.prop('readonly');
            if (evt.which == Sao.common.F3_KEYCODE && editable) {
                this.new_();
                evt.preventDefault();
            } else if (evt.which == Sao.common.F2_KEYCODE) {
                this.open();
                evt.preventDefault();
            }
        },
        set_value: function(record, field) {
            if (this.text) {
                this.filename_field().set_client(record,
                        this.text.val() || '');
            }
        },
        set_readonly: function(readonly) {
            if (readonly) {
                this.but_select.hide();
                this.but_clear.hide();

            } else {
                this.but_select.show();
                this.but_clear.show();
            }
            if (this.wid_text) {
                this.wid_text.prop('readonly', readonly);
            }
        }
    });

    Sao.View.Form.MultiSelection = Sao.class_(Sao.View.Form.Selection, {
        class_: 'form-multiselection',
        init: function(field_name, model, attributes) {
            this.nullable_widget = false;
            Sao.View.Form.MultiSelection._super.init.call(this, field_name,
                model, attributes);
            this.select.prop('multiple', true);
        },
        display_update_selection: function(record, field) {
            var i, len, element;
            this.update_selection(record, field, function() {
                if (!field) {
                    return;
                }
                var value = [];
                var group = record.field_get_client(this.field_name);
                for (i = 0, len = group.length; i < len; i++) {
                    element = group[i];
                    if (!~group.record_removed.indexOf(element) &&
                        !~group.record_deleted.indexOf(element)) {
                            value.push(element.id);
                    }
                }
                this.el.val(value);
            }.bind(this));
        },
        set_value: function(record, field) {
            var value = this.el.val();
            if (value) {
                value = value.map(function(e) { return parseInt(e, 10); });
            } else {
                value = [];
            field.set_client(record, value);
            }
        }
    });

    Sao.View.Form.Image = Sao.class_(Sao.View.Form.BinaryMixin, {
        class_: 'form-image',
        init: function(field_name, model, attributes) {
            Sao.View.Form.Image._super.init.call(
                    this, field_name, model, attributes);
            this.height = parseInt(attributes.height || 100, 10);
            this.width = parseInt(attributes.width || 300, 10);

            this.el = jQuery('<div/>');
            this.image = jQuery('<img/>', {
                'class': 'center-block'
            }).appendTo(this.el);
            this.image.css('max-height', this.height);
            this.image.css('max-width', this.width);
            this.image.css('height', 'auto');
            this.image.css('width', 'auto');

            var group = this.toolbar('btn-group');
            if (!attributes.readonly) {
                jQuery('<div/>', {
                    'class': 'text-center'
                }).append(group).appendTo(this.el);
            }
            this.update_img();
        },
        set_readonly: function(readonly) {
            [this.but_select, this.but_open, this.but_save_as, this.but_clear]
                .forEach(function(button) {
                    if (button) {
                        button.prop('disable', readonly);
                    }
                });
        },
        clear: function() {
            Sao.View.Form.Image._super.clear.call(this);
            this.update_img();
        },
        update_img: function() {
            var value;
            var record = this.record();
            if (record) {
                value = record.field_get_client(this.field_name);
            }
            if (value) {
                if (value > Sao.common.BIG_IMAGE_SIZE) {
                    value = jQuery.when(null);
                } else {
                    value = record.model.fields[this.field_name]
                        .get_data(record);
                }
            } else {
                value = jQuery.when(null);
            }
            value.done(function(data) {
                var url, blob;
                if (!data) {
                    url = null;
                } else {
                    blob = new Blob([data]);
                    url = window.URL.createObjectURL(blob);
                }
                this.image.attr('src', url);
            }.bind(this));
        },
        display: function(record, field) {
            Sao.View.Form.Image._super.display.call(this, record, field);
            this.update_img();
        }
    });

    Sao.View.Form.URL = Sao.class_(Sao.View.Form.Char, {
        class_: 'form-url',
        init: function(field_name, model, attributes) {
            Sao.View.Form.URL._super.init.call(
                    this, field_name, model, attributes);
            this.button = jQuery('<a/>', {
                'class': 'btn btn-default',
                'target': '_new'
            }).appendTo(jQuery('<span/>', {
                'class': 'input-group-btn'
            }).appendTo(this.group));
            this.icon = jQuery('<img/>').appendTo(this.button);
            this.set_icon();
        },
        display: function(record, field) {
            Sao.View.Form.URL._super.display.call(this, record, field);
            var url = '';
            if (record) {
                url = record.field_get_client(this.field_name);
            }
            this.set_url(url);
            if (record & this.attributes.icon) {
                var icon = this.attributes.icon;
                var value;
                if (icon in record.model.fields) {
                    value = record.field_get_client(icon);
                } else {
                    value = icon;
                }
                this.set_icon(value);
            }
        },
        set_icon: function(value) {
            value = value || 'tryton-web-browser';
            Sao.common.ICONFACTORY.register_icon(value).done(function(url) {
                this.icon.attr('src', url);
            }.bind(this));
        },
        set_url: function(value) {
            this.button.attr('href', value);
        },
        set_readonly: function(readonly) {
            Sao.View.Form.URL._super.set_readonly.call(this, readonly);
            if (readonly) {
                this.input.hide();
                this.button.removeClass('btn-default');
                this.button.addClass('btn-link');
            } else {
                this.input.show();
                this.button.removeClass('btn-link');
                this.button.addClass('btn-default');
            }
        }
    });

    Sao.View.Form.Email = Sao.class_(Sao.View.Form.URL, {
        class_: 'form-email',
        set_url: function(value) {
            Sao.View.Form.Email._super.set_url.call(this, 'mailto:' + value);
        }
    });

    Sao.View.Form.CallTo = Sao.class_(Sao.View.Form.URL, {
        class_: 'form-callto',
        set_url: function(value) {
            Sao.View.Form.CallTo._super.set_url.call(this, 'callto:' + value);
        }
    });

    Sao.View.Form.SIP = Sao.class_(Sao.View.Form.URL, {
        class_: 'form-sip',
        set_url: function(value) {
            Sao.View.Form.SIP._super.set_url.call(this, 'sip:' + value);
        }
    });

    Sao.View.Form.ProgressBar = Sao.class_(Sao.View.Form.Widget, {
        class_: 'form-char',
        init: function(field_name, model, attributes) {
            Sao.View.Form.ProgressBar._super.init.call(
                    this, field_name, model, attributes);
            this.el = jQuery('<div/>', {
                'class': this.class_ + ' progress'
            });
            this.progressbar = jQuery('<div/>', {
                'class': 'progress-bar',
                'role': 'progressbar',
                'aria-valuemin': 0,
                'aria-valuemax': 100
            }).appendTo(this.el);
            this.progressbar.css('min-width: 2em');
        },
        display: function(record, field) {
            Sao.View.Form.ProgressBar._super.display.call(
                    this, record, field);
            var value, text;
            if (!field) {
                value = 0;
                text = '';
            } else {
                value = field.get(record);
                text = field.get_client(record, 100);
                if (text) {
                    text = Sao.i18n.gettext('%1%', text);
                }
            }
            this.progressbar.attr('aria-valuenow', value * 100);
            this.progressbar.css('width', value * 100 + '%');
            this.progressbar.text(text);
        }
    });

    Sao.View.Form.Dict = Sao.class_(Sao.View.Form.Widget, {
        class_: 'form-dict',
        init: function(field_name, model, attributes) {
            Sao.View.Form.Dict._super.init.call(
                    this, field_name, model, attributes);
            this.schema_model = new Sao.Model(attributes.schema_model);
            this.keys = {};
            this.fields = {};
            this.rows = {};
            this.no_command = attributes.no_command || false;

            this.el = jQuery('<div/>', {
                'class': this.class_ + ' panel panel-default'
            });

            var heading = jQuery('<div/>', {
                'class': this.class_ + '-heading panel-heading'
            }).appendTo(this.el);
            var label = jQuery('<label/>', {
                'class': this.class_ + '-string',
                'text': attributes.string
            }).appendTo(heading);

            label.uniqueId();
            this.el.uniqueId();
            this.el.attr('aria-labelledby', label.attr('id'));
            label.attr('for', this.el.attr('id'));

            var body = jQuery('<div/>', {
                'class': this.class_ + '-body panel-body'
            }).appendTo(this.el);
            this.container = jQuery('<div/>', {
                'class': this.class_ + '-container'
            }).appendTo(body);

            // [Coog specific]
            //      > attribute no_command (hide input line)
            if (!this.no_command){
                var group = jQuery('<div/>', {
                    'class': 'input-group input-group-sm'
                }).appendTo(jQuery('<div>', {
                    'class': 'col-md-12'
                }).appendTo(jQuery('<div/>', {
                    'class': 'row'
                }).appendTo(jQuery('<div/>', {
                    'class': 'container-fluid'
                }).appendTo(body))));
                this.wid_text = jQuery('<input/>', {
                    'type': 'text',
                    'class': 'form-control input-sm'
                }).appendTo(group);

                // TODO completion

                this.but_add = jQuery('<button/>', {
                    'class': 'btn btn-default btn-sm',
                    'type': 'button',
                    'aria-label': Sao.i18n.gettext('Add')
                }).append(jQuery('<span/>', {
                    'class': 'glyphicon glyphicon-plus'
                })).appendTo(jQuery('<div/>', {
                    'class': 'input-group-btn'
                }).appendTo(group));
                this.but_add.click(this.add.bind(this));
            }
            this._readonly = false;
            this._record_id = null;
        },
        add: function() {
            var context = this.field().get_context(this.record());
            var value = this.wid_text.val();
            var domain = this.field().get_domain(this.record());

            var callback = function(result) {
                if (!jQuery.isEmptyObject(result)) {
                    var ids = result.map(function(e) {
                        return e[0];
                    });
                    this.add_new_keys(ids);
                }
                this.wid_text.val('');
            }.bind(this);

            var parser = new Sao.common.DomainParser();
            var win = new Sao.Window.Search(this.schema_model.name,
                    callback, {
                        sel_multi: true,
                        context: context,
                        domain: domain,
                        new_: false,
                        search_filter: parser.quote(value)
                    });
        },
        add_new_keys: function(ids) {
            var context = this.field().get_context(this.record());
            this.schema_model.execute('get_keys', [ids], context)
                .then(function(new_fields) {
                    var focus = false;
                    new_fields.forEach(function(new_field) {
                        if (this.fields[new_field.name]) {
                            return;
                        }
                        this.keys[new_field.name] = new_field;
                        this.add_line(new_field.name);
                        if (!focus) {
                            this.fields[new_field.name].input.focus();
                            focus = true;
                        }
                    }.bind(this));
                }.bind(this));
        },
        remove: function(key, modified) {
            if (modified === undefined) {
                modified = true;
            }
            delete this.fields[key];
            this.rows[key].remove();
            delete this.rows[key];
            if (modified) {
                this.set_value(this.record(), this.field());
            }
        },
        set_value: function(record, field) {
            field.set_client(record, this.get_value());
        },
        get_value: function() {
            var value = {};
            for (var key in this.fields) {
                var widget = this.fields[key];
                value[key] = widget.get_value();
            }
            return value;
        },
        set_readonly: function(readonly) {
            this._readonly = readonly;
            this._set_button_sensitive();
            for (var key in this.fields) {
                var widget = this.fields[key];
                widget.set_readonly(readonly);
            }
            if (!this.no_command)
                this.wid_text.prop('disabled', readonly);
        },
        _set_button_sensitive: function() {
            var create = this.attributes.create;
            if (create === undefined) {
                create = true;
            }
            var delete_ = this.attributes['delete'];
            if (delete_ === undefined) {
                delete_ = true;
            }
            if (!this.no_command){
                this.but_add.prop('disabled', this._readonly || !create);
                for (var key in this.fields) {
                    var button = this.fields[key].button;
                    button.prop('disabled', this._readonly || !delete_);
                }
            }
        },
        add_line: function(key) {
            var field, row;
            this.fields[key] = field = new (this.get_entries(
                        this.keys[key].type_))(key, this);
            this.rows[key] = row = jQuery('<div/>', {
                'class': 'row'
            });
            // TODO RTL
            var text = this.keys[key].string + Sao.i18n.gettext(':');
            var label = jQuery('<label/>', {
                'text': text
            }).appendTo(jQuery('<div/>', {
                'class': 'dict-label col-md-4'
            }).appendTo(row));

            field.el.addClass('col-md-8').appendTo(row);

            label.uniqueId();
            field.labelled.uniqueId();
            field.labelled.attr('aria-labelledby', label.attr('id'));
            label.attr('for', field.labelled.attr('id'));

            if (!this.no_command){
                field.button = jQuery('<button/>', {
                    'class': 'btn btn-default',
                    'type': 'button',
                    'arial-label': Sao.i18n.gettext('Remove')
                }).append(jQuery('<span/>', {
                    'class': 'glyphicon glyphicon-minus'
                })).appendTo(jQuery('<div/>', {
                    'class': 'input-group-btn'
                }).appendTo(field.group));

                field.button.click(function() {
                    this.remove(key, true);
                }.bind(this));
            }
            row.appendTo(this.container);
        },
        add_keys: function(keys) {
            var context = this.field().get_context(this.record());
            var domain = this.field().get_domain(this.record());
            var batchlen = Math.min(10, Sao.config.limit);
            keys = jQuery.extend([], keys);

            var get_keys = function(key_ids) {
                return this.schema_model.execute('get_keys',
                        [key_ids], context).then(update_keys);
            }.bind(this);
            var update_keys = function(values) {
                for (var i = 0, len = values.length; i < len; i++) {
                    var k = values[i];
                    this.keys[k.name] = k;
                }
            }.bind(this);

            var prms = [];
            while (keys.length > 0) {
                var sub_keys = keys.splice(0, batchlen);
                prms.push(this.schema_model.execute('search',
                            [[['name', 'in', sub_keys], domain],
                            0, Sao.config.limit, null], context)
                        .then(get_keys));
            }
            return jQuery.when.apply(jQuery, prms);
        },
        display: function(record, field) {
            Sao.View.Form.Dict._super.display.call(this, record, field);
            if (!field) {
                return;
            }

            var record_id = record ? record.id : null;
            var key;

            if (record_id != this._record_id) {
                for (key in this.fields) {
                    this.remove(key, false);
                }
                this._record_id = record_id;
            }

            var value = field.get_client(record);
            var new_key_names = Object.keys(value).filter(function(e) {
                return !this.keys[e];
            }.bind(this));

            var prm;
            if (!jQuery.isEmptyObject(new_key_names)) {
                prm = this.add_keys(new_key_names);
            } else {
                prm = jQuery.when();
            }
            prm.then(function() {
                var i, len, key;
                var keys = Object.keys(value).sort();
                for (i = 0, len = keys.length; i < len; i++) {
                    key = keys[i];
                    var val = value[key];
                    if (!this.keys[key]) {
                        continue;
                    }
                    if (!this.fields[key]) {
                        this.add_line(key);
                    }
                    var widget = this.fields[key];
                    widget.set_value(val);
                    widget.set_readonly(this._readonly);
                }
                var removed_key_names = Object.keys(this.fields).filter(
                        function(e) {
                            // [Bug Sao] server can return null
                            //           as false for boolean.
                            return (value[e] === undefined);
                        });
                for (i = 0, len = removed_key_names.length; i < len; i++) {
                    key = removed_key_names[i];
                    this.remove(key, false);
                }
            }.bind(this));
            this._set_button_sensitive();
        },
        get_entries: function(type) {
            switch (type) {
                case 'char':
                    return Sao.View.Form.Dict.Entry;
                case 'boolean':
                    return Sao.View.Form.Dict.Boolean;
                case 'selection':
                    return Sao.View.Form.Dict.Selection;
                case 'integer':
                    return Sao.View.Form.Dict.Integer;
                case 'float':
                    return Sao.View.Form.Dict.Float;
                case 'numeric':
                    return Sao.View.Form.Dict.Numeric;
                case 'date':
                    return Sao.View.Form.Dict.Date;
                case 'datetime':
                    return Sao.View.Form.Dict.DateTime;
            }
        }
    });

    Sao.View.Form.Dict.Entry = Sao.class_(Object, {
        class_: 'dict-char',
        init: function(name, parent_widget) {
            this.name = name;
            this.definition = parent_widget.keys[name];
            this.parent_widget = parent_widget;
            this.create_widget();
        },
        create_widget: function() {
            this.el = jQuery('<div/>', {
                'class': this.class_
            });
            var group = jQuery('<div/>', {
                'class': 'input-group input-group-sm'
            }).appendTo(this.el).css('width', '100%');
            this.input = this.labelled = jQuery('<input/>', {
                'type': 'text',
                'class': 'form-control input-sm'
            }).appendTo(group);
            this.el.change(
                    this.parent_widget.focus_out.bind(this.parent_widget));
            this.group = group;
        },
        get_value: function() {
            return this.input.val();
        },
        set_value: function(value) {
            this.input.val(value || '');
        },
        set_readonly: function(readonly) {
            this.input.prop('readonly', readonly);
        }
    });

    Sao.View.Form.Dict.Boolean = Sao.class_(Sao.View.Form.Dict.Entry, {
        class_: 'dict-boolean',
        create_widget: function() {
            Sao.View.Form.Dict.Boolean._super.create_widget.call(this);
            this.input.attr('type', 'checkbox');
            this.input.change(
                    this.parent_widget.focus_out.bind(this.parent_widget));
        },
        get_value: function() {
            return this.input.prop('checked');
        },
        set_value: function(value) {
            this.input.prop('checked', value);
        }
    });

    Sao.View.Form.Dict.Selection = Sao.class_(Sao.View.Form.Dict.Entry, {
        class_: 'dict-selection',
        create_widget: function() {
            Sao.View.Form.Dict.Selection._super.create_widget.call(this);
            var select = jQuery('<select/>', {
                'class': 'form-control input-sm'
            });
            select.change(
                    this.parent_widget.focus_out.bind(this.parent_widget));
            this.input.replaceWith(select);
            this.input = this.labelled = select;
            var selection = jQuery.extend([], this.definition.selection);
            selection.splice(0, 0, [null, '']);
            selection.forEach(function(e) {
                select.append(jQuery('<option/>', {
                    'value': JSON.stringify(e[0]),
                    'text': e[1],
                }));
            });
        },
        get_value: function() {
            return JSON.parse(this.input.val());
        },
        set_value: function(value) {
            this.input.val(JSON.stringify(value));
        }
    });

    Sao.View.Form.Dict.Integer = Sao.class_(Sao.View.Form.Dict.Entry, {
        class_: 'dict-integer',
        get_value: function() {
            var value = parseInt(this.input.val(), 10);
            if (isNaN(value)) {
                return null;
            }
            return value;
        }
    });

    Sao.View.Form.Dict.Float = Sao.class_(Sao.View.Form.Dict.Integer, {
        class_: 'dict-float',
        get_value: function() {
            var value = Number(this.input.val());
            if (isNaN(value)) {
                return null;
            }
            return value;
        }
    });

    Sao.View.Form.Dict.Numeric = Sao.class_(Sao.View.Form.Dict.Float, {
        class_: 'dict-numeric',
        get_value: function() {
            var value = new Sao.Decimal(this.input.val());
            if (isNaN(value.valueOf())) {
                return null;
            }
            return value;
        }
    });

    Sao.View.Form.Dict.Date = Sao.class_(Sao.View.Form.Dict.Entry, {
        class_: 'dict-date',
        format: '%x',
        create_widget: function() {
            Sao.View.Form.Dict.Date._super.create_widget.call(this);
            var group = this.button.parent();
            jQuery('<button/>', {
                'class': 'datepickerbutton btn btn-default',
                'type': 'button'
            }).append(jQuery('<span/>', {
                'class': 'glyphicon glyphicon-calendar'
            })).prependTo(group);
            this.input.datetimepicker({
                'format': Sao.common.moment_format(this.format)
            });
            this.input.on('dp.change',
                    this.parent_widget.focus_out.bind(this.parent_widget));
        },
        get_value: function() {
            var value = this.input.data('DateTimePicker').date();
            if (value) {
                // [Bug Sao] - DateTimePicker.date() return dateTime
                // TODO: report to tryton
                value.startOf('day');
                value.isDate = true;
            }
            return value;
        },
        set_value: function(value) {
            this.date.data('DateTimePicker').date(value);
        }
    });

    Sao.View.Form.Dict.DateTime = Sao.class_(Sao.View.Form.Dict.Date, {
        class_: 'dict-datetime',
        format: '%x %X',
        get_value: function() {
            var value = this.input.data('DateTimePicker').date();
            if (value) {
                value.isDateTime = true;
            }
            return value;
        }
    });

}());

/* This file is part of Tryton.  The COPYRIGHT file at the top level of
   this repository contains the full copyright notices and license terms. */
(function() {
    'use strict';

    Sao.View.tree_column_get = function(type) {
        switch (type) {
            case 'char':
                return Sao.View.Tree.CharColumn;
            case 'text':
                return Sao.View.Tree.TextColum;
            case 'many2one':
                return Sao.View.Tree.Many2OneColumn;
            case 'one2one':
                return Sao.View.Tree.One2OneColumn;
            case 'date':
                return Sao.View.Tree.DateColumn;
            case 'time':
                return Sao.View.Tree.TimeColumn;
            case 'timedelta':
                return Sao.View.Tree.TimeDeltaColumn;
            case 'one2many':
                return Sao.View.Tree.One2ManyColumn;
            case 'many2many':
                return Sao.View.Tree.Many2ManyColumn;
            case 'selection':
                return Sao.View.Tree.SelectionColumn;
            case 'reference':
                return Sao.View.Tree.ReferenceColumn;
            case 'float':
            case 'numeric':
                return Sao.View.Tree.FloatColumn;
            case 'integer':
            case 'biginteger':
                return Sao.View.Tree.IntegerColumn;
            case 'boolean':
                return Sao.View.Tree.BooleanColumn;
            case 'binary':
                return Sao.View.Tree.BinaryColumn;
            case 'image':
                return Sao.View.Tree.ImageColumn;
            case 'url':
            case 'email':
            case 'callto':
            case 'sip':
                return Sao.View.Tree.URLColumn;
            case 'progressbar':
                return Sao.View.Tree.ProgressBar;
        }
    };

    Sao.View.Tree = Sao.class_(Sao.View, {
        init: function(screen, xml, children_field, children_definitions) {
            Sao.View.Tree._super.init.call(this, screen, xml);
            this.view_type = 'tree';
            this.selection_mode = (screen.attributes.selection_mode ||
                Sao.common.SELECTION_SINGLE);
            this.el = jQuery('<div/>', {
                'class': 'treeview responsive'
            });
            this.expanded = {};
            this.children_field = children_field;
            this.children_definitions = children_definitions;
            // [Coog specific]
            //      > attribute always_expand (expand tree view)
            this.always_expand = this.attributes.always_expand || null;
            // [Bug Sao] set search windows readonly
            if (screen.attributes.editable !== undefined){
                this.editable = screen.attributes.editable;
            } else{
                this.editable = Boolean(this.attributes.editable);
            }

            // Columns
            this.columns = [];
            this.create_columns(screen.model, xml);

            // Table of records
            this.rows = [];
            this.table = jQuery('<table/>', {
                'class': 'tree table table-hover table-striped'
            });
            if (this.columns.filter(function(c) {
                return !c.attributes.tree_invisible;
            }).length > 1) {
                this.table.addClass('responsive');
                this.table.addClass('responsive-header');
            }
            this.el.append(this.table);
            var thead = jQuery('<thead/>');
            this.table.append(thead);
            var tr = jQuery('<tr/>');
            if (this.selection_mode != Sao.common.SELECTION_NONE) {
                var th = jQuery('<th/>', {
                    'class': 'selection'
                });
                this.selection = jQuery('<input/>', {
                    'type': 'checkbox',
                    'class': 'selection'
                });
                this.selection.change(this.selection_changed.bind(this));
                th.append(this.selection);
                tr.append(th);
            }
            thead.append(tr);
            this.columns.forEach(function(column) {
                th = jQuery('<th/>');
                var label = jQuery('<label/>')
                    .text(column.attributes.string);
                if (this.editable) {
                    if (column.attributes.required) {
                        label.addClass('required');
                    }
                    if (!column.attributes.readonly) {
                        label.addClass('editable');
                    }
                }
                tr.append(th.append(label));
                column.header = th;
            }, this);
            this.tbody = jQuery('<tbody/>');
            this.table.append(this.tbody);

            // Footer for more
            var footer = jQuery('<div/>', {
                'class': 'treefooter'
            });
            this.more = jQuery('<button/>', {
                'class': 'btn btn-default',
                'type': 'button'
            }).append(Sao.i18n.gettext('More')
                ).click(function() {
                this.display_size += Sao.config.display_size;
                this.display();
            }.bind(this));
            footer.append(this.more);
            this.more.hide();
            this.display_size = Sao.config.display_size;
            this.el.append(footer);
        },
        create_columns: function(model, xml) {
            xml.find('tree').children().each(function(pos, child) {
                var column, editable_column, attribute;
                var attributes = {};
                for (var i = 0, len = child.attributes.length; i < len; i++) {
                    attribute = child.attributes[i];
                    attributes[attribute.name] = attribute.value;
                }
                ['readonly', 'tree_invisible', 'expand', 'completion'].forEach(
                    function(name) {
                        if (attributes[name]) {
                            attributes[name] = attributes[name] == 1;
                        }
                    });
                if (child.tagName == 'field') {
                    var name = attributes.name;
                    if (!attributes.widget) {
                        attributes.widget = model.fields[name].description.type;
                    }
                    var attribute_names = ['relation', 'domain', 'selection',
                        'relation_field', 'string', 'views', 'invisible',
                        'add_remove', 'sort', 'context', 'filename',
                        'autocomplete', 'translate', 'create', 'delete',
                        'selection_change_with', 'schema_model', 'required',
                        'readonly'];
                    for (i in attribute_names) {
                        var attr = attribute_names[i];
                        if ((attr in model.fields[name].description) &&
                            (child.getAttribute(attr) === null)) {
                            attributes[attr] = model.fields[name]
                                .description[attr];
                        }
                    }
                    var ColumnFactory = Sao.View.tree_column_get(
                        attributes.widget);
                    column = new ColumnFactory(model, attributes);

                    var prefixes = [], suffixes = [];
                    if (~['url', 'email', 'callto', 'sip'
                            ].indexOf(attributes.widget)) {
                        column.prefixes.push(new Sao.View.Tree.Affix(
                                    attributes, attributes.widget));
                    }
                    if ('icon' in attributes) {
                        column.prefixes.push(new Sao.View.Tree.Affix(
                                    attributes));
                    }
                    var affix, affix_attributes;
                    var affixes = child.childNodes;
                    for (i = 0; i < affixes.length; i++) {
                        affix = affixes[i];
                        affix_attributes = {};
                        for (i = 0, len = affix.attributes.length; i < len;
                                i++) {
                            attribute = affix.attributes[i];
                            affix_attributes[attribute.name] = attribute.value;
                        }
                        if (!affix_attributes.name) {
                            affix_attributes.name = name;
                        }
                        if (affix.tagName == 'prefix') {
                            column.prefixes.push(new Sao.View.Tree.Affix(
                                        affix_attributes));
                        } else {
                            column.suffixes.push(new Sao.View.Tree.Affix(
                                        affix_attributes));
                        }
                    }

                    this.fields[name] = true;
                    // TODO sum
                } else if (child.tagName == 'button') {
                    column = new Sao.View.Tree.ButtonColumn(this.screen,
                            attributes);
                }
                this.columns.push(column);
            }.bind(this));
        },
        get_buttons: function() {
            var buttons = [];
            this.columns.forEach(function(column) {
                if (column instanceof Sao.View.Tree.ButtonColumn) {
                    buttons.push(column);
                }
            });
            return buttons;
        },
        display: function(selected, expanded) {
            var current_record = this.screen.current_record;
            if (!selected) {
                selected = this.get_selected_paths();
                if (current_record) {
                    var current_path = current_record.get_path(this.screen.group);
                    current_path = current_path.map(function(e) {
                        return e[1];
                    });
                    if (!Sao.common.contains(selected, current_path)) {
                        selected = [current_path];
                    }
                } else if (!current_record) {
                    selected = [];
                }
            }
            expanded = expanded || [];

            if ((this.screen.group.length != this.rows.length) ||
                    !Sao.common.compare(
                        this.screen.group, this.rows.map(function(row) {
                            return row.record;
                        })) || this.children_field) {  // XXX find better check
                                                       // to keep focus
                this.construct(selected, expanded);
            }

            // Set column visibility depending on attributes and domain
            var domain = [];
            if (!jQuery.isEmptyObject(this.screen.domain)) {
                domain.push(this.screen.domain);
            }
            var tab_domain = this.screen.screen_container.get_tab_domain();
            if (!jQuery.isEmptyObject(tab_domain)) {
                domain.push(tab_domain);
            }
            var inversion = new Sao.common.DomainInversion();
            domain = inversion.simplify(domain);
            this.columns.forEach(function(column) {
                var name = column.attributes.name;
                if (!name) {
                    return;
                }
                if (column.attributes.tree_invisible) {
                    column.header.hide();
                } else if (name === this.screen.exclude_field) {
                    column.header.hide();
                } else {
                    var inv_domain = inversion.domain_inversion(domain, name);
                    if (typeof inv_domain != 'boolean') {
                        inv_domain = inversion.simplify(inv_domain);
                    }
                    var unique = inversion.unique_value(inv_domain)[0];
                    if (unique && jQuery.isEmptyObject(this.children_field)) {
                        column.header.hide();
                    } else {
                        column.header.show();
                    }
                }
            }.bind(this));

            this.redraw(selected, expanded);
            return jQuery.when();
        },
        construct: function(selected, expanded) {
            this.rows = [];
            this.tbody.empty();
            var add_row = function(record, pos, group) {
                var RowBuilder;
                if (this.editable) {
                    RowBuilder = Sao.View.Tree.RowEditable;
                } else {
                    RowBuilder = Sao.View.Tree.Row;
                }
                var tree_row = new RowBuilder(this, record, pos);
                this.rows.push(tree_row);
                tree_row.construct(selected, expanded);
            };
            this.screen.group.slice(0, this.display_size).forEach(
                    add_row.bind(this));
            if (this.display_size >= this.screen.group.length) {
                this.more.hide();
            } else {
                this.more.show();
            }
        },
        redraw: function(selected, expanded) {
            var redraw_row = function(record, pos, group) {
               this.rows[pos].redraw(selected, expanded);
            };
            this.screen.group.slice(0, this.display_size).forEach(
                    redraw_row.bind(this));
        },
        switch_: function(path) {
            this.screen.row_activate();
        },
        select_changed: function(record) {
            var previous_record = this.screen.current_record;
            this.screen.set_current_record(record);
            if (this.editable && previous_record) {
                var go_previous = function() {
                    this.screen.set_current_record(previous_record);
                    this.set_cursor();
                }.bind(this);
                if (!this.screen.group.parent && previous_record !== record) {
                    previous_record.validate(this.get_fields())
                        .then(function(validate) {
                            if (!validate) {
                                go_previous();
                            } else {
                                previous_record.save().fail(go_previous);
                            }
                        });
                } else if (previous_record !== record &&
                        this.screen.attributes.pre_validate) {
                    previous_record.pre_validate().then(function(validate) {
                        if (!validate) {
                            go_previous();
                        }
                    });
                }
            }
            // TODO update_children
        },
        selected_records: function() {
            if (this.selection_mode == Sao.common.SELECTION_NONE) {
                return [];
            }
            var records = [];
            var add_record = function(row) {
                if (row.is_selected()) {
                    records.push(row.record);
                }
                row.rows.forEach(add_record);
            };
            this.rows.forEach(add_record);
            if (this.selection.prop('checked') &&
                    !this.selection.prop('indeterminate')) {
                this.screen.group.slice(this.rows.length)
                    .forEach(function(record) {
                        records.push(record);
                    });
            }
            return records;
        },
        selection_changed: function() {
            var value = this.selection.prop('checked');
            var set_checked = function(row) {
                row.set_selection(value);
                row.rows.forEach(set_checked);
            };
            this.rows.forEach(set_checked);
            if (value && this.rows[0]) {
                this.select_changed(this.rows[0].record);
            } else {
                this.select_changed(null);
            }
        },
        update_selection: function() {
            if (this.selection.prop('checked')) {
                return;
            }
            var selected_records = this.selected_records();
            this.selection.prop('indeterminate', false);
            if (jQuery.isEmptyObject(selected_records)) {
                this.selection.prop('checked', false);
            } else if (selected_records.length ==
                    this.tbody.children().length &&
                    this.display_size >= this.screen.group.length) {
                this.selection.prop('checked', true);
            } else {
                this.selection.prop('indeterminate', true);
                // Set checked to go first unchecked after first click
                this.selection.prop('checked', true);
            }
        },
        get_selected_paths: function() {
            var selected_paths = [];
            function get_selected(row, path) {
                var i, r, len, r_path;
                for (i = 0, len = row.rows.length; i < len; i++) {
                    r = row.rows[i];
                    r_path = path.concat([r.record.id]);
                    if (r.is_selected()) {
                        selected_paths.push(r_path);
                    }
                    get_selected(r, r_path);
                }
            }
            get_selected(this, []);
            return selected_paths;
        },
        get_expanded_paths: function(starting_path, starting_id_path) {
            var id_path, id_paths, row, children_rows, path;
            if (starting_path === undefined) {
                starting_path = [];
            }
            if (starting_id_path === undefined) {
                starting_id_path = [];
            }
            id_paths = [];
            row = this.find_row(starting_path);
            children_rows = row ? row.rows : this.rows;
            for (var path_idx = 0, len = this.n_children(row) ;
                    path_idx < len ; path_idx++) {
                path = starting_path.concat([path_idx]);
                row = children_rows[path_idx];
                if (row && row.is_expanded()) {
                    id_path = starting_id_path.concat(row.record.id);
                    id_paths.push(id_path);
                    id_paths = id_paths.concat(this.get_expanded_paths(path,
                                id_path));
                }
            }
            return id_paths;
        },
        find_row: function(path) {
            var index;
            var row = null;
            var group = this.rows;
            for (var i=0, len=path.length; i < len; i++) {
                index = path[i];
                if (!group || index >= group.length) {
                    return null;
                }
                row = group[index];
                group = row.rows;
                if (!this.children_field) {
                    break;
                }
            }
            return row;
        },
        n_children: function(row) {
            if (!row || !this.children_field || row.is_leaf()) {
                    return this.rows.length;
            }
            return row.record._values[this.children_field].length;
        },
        set_cursor: function(new_, reset_view) {
            var i, root_group, path, row_path, row, column;
            var row_idx, rest, td;

            if (!this.screen.current_record) {
                return;
            }

            path = null;
            for (i = 0; i < this.rows.length; i++) {
                row_path = this.rows[i].record_to_path(
                        this.screen.current_record);
                if (row_path) {
                    row_path.unshift(i);
                    path = row_path;
                    break;
                }
            }

            row = null;
            if (path) {
                row_idx = path[0];
                rest = path.slice(1);
                if (rest.length > 0) {
                    this.rows[row_idx].expand_to_path(rest);
                }
                row = this.find_row(path);
            } else if (this.rows.length > 0) {
                row = this.rows[0];
            }

            if (row) {
                column = row.next_column(null, new_);
                if (column !== null) {
                    td = row._get_column_td(column);
                    if (this.editable) {
                        td.triggerHandler('click');
                        if (new_) {
                            td.triggerHandler('click');
                        } else {
                            td.find(':input,[tabindex=0]').focus();
                        }
                    } else {
                        td.find(':input,[tabindex=0]').focus();
                    }
                }
            }
        }
    });

    Sao.View.Tree.Row = Sao.class_(Object, {
        init: function(tree, record, pos, parent) {
            this.tree = tree;
            this.rows = [];
            this.record = record;
            this.parent_ = parent;
            this.children_field = tree.children_field;
            this.children_definitions = tree.children_definitions;
            this.expander = null;
            var path = [];
            if (parent) {
                path = jQuery.extend([], parent.path.split('.'));
            }
            path.push(pos);
            this.path = path.join('.');
            this.el = jQuery('<tr/>');
        },
        is_expanded: function() {
            return (this.path in this.tree.expanded);
        },
        get_last_child: function() {
            if (!this.children_field || !this.is_expanded() ||
                    jQuery.isEmptyObject(this.rows)) {
                return this;
            }
            return this.rows[this.rows.length - 1].get_last_child();
        },
        get_id_path: function() {
            if (!this.parent_) {
                return [this.record.id];
            }
            return this.parent_.get_id_path().concat([this.record.id]);
        },
        build_widgets: function() {
            var table = jQuery('<table/>');
            table.css('width', '100%');
            var row = jQuery('<tr/>');
            table.append(row);
            return [table, row];
        },
        construct: function(selected, expanded) {
            selected = selected || [];
            expanded = expanded || [];

            var el_node = this.el[0];
            while (el_node.firstChild) {
                el_node.removeChild(el_node.firstChild);
            }

            var td;
            if (this.tree.selection_mode != Sao.common.SELECTION_NONE) {
                td = jQuery('<td/>', {
                    'class': 'selection'
                });
                this.el.append(td);
                this.selection = jQuery('<input/>', {
                    'type': 'checkbox',
                    'class': 'selection'
                });
                this.selection.change(this.selection_changed.bind(this));
                td.append(this.selection);
            }

            var depth = this.path.split('.').length;
            for (var i = 0; i < this.tree.columns.length; i++) {
                var column = this.tree.columns[i];
                td = jQuery('<td/>', {
                    'data-title': column.attributes.string
                }).append(jQuery('<div/>', { // For responsive min-height
                    'aria-hidden': true
                }));
                td.css('overflow', 'hidden');
                td.on('click keypress', {column: i, td: td},
                        Sao.common.click_press(this.select_row.bind(this),
                            true));
                if (!this.tree.editable) {
                    td.dblclick(this.switch_row.bind(this));
                }
                var widgets = this.build_widgets();
                var table = widgets[0];
                var row = widgets[1];
                td.append(table);
                if ((i === 0) && this.children_field) {
                    var expanded_icon = 'glyphicon-plus';
                    if (this.is_expanded() ||
                            ~expanded.indexOf(this.record.id)) {
                        expanded_icon = 'glyphicon-minus';
                    }
                    this.expander = jQuery('<span/>', {
                        'class': 'glyphicon ' + expanded_icon,
                        'tabindex': 0
                    });
                    this.expander.html('&nbsp;');
                    this.expander.css('margin-left', (depth - 1) + 'em');
                    this.expander.css('float', 'left');
                    this.expander.on('click keypress',
                            Sao.common.click_press(this.toggle_row.bind(this)));
                    row.append(jQuery('<td/>', {
                        'class': 'expander'
                    }).append(this.expander).css('width', 1));
                }
                var j;
                if (column.prefixes) {
                    for (j = 0; j < column.prefixes.length; j++) {
                        var prefix = column.prefixes[j];
                        row.append(jQuery('<td/>', {
                            'class': 'prefix'
                        }).css('width', 1));
                    }
                }
                row.append(jQuery('<td/>', {
                    'class': 'widget'
                }));
                if (column.suffixes) {
                    for (j = 0; j < column.suffixes.length; j++) {
                        var suffix = column.suffixes[j];
                        row.append(jQuery('<td/>', {
                            'class': 'suffix'
                        }).css('width', 1));
                    }
                }

                this.el.append(td);
            }
            if (this.parent_) {
                var last_child = this.parent_.get_last_child();
                last_child.el.after(this.el);
            } else {
                this.tree.tbody.append(this.el);
            }
            var row_id_path = this.get_id_path();
            if (this.is_expanded() ||
                    Sao.common.contains(expanded, row_id_path) ||
                    (this.tree.always_expand && !this.is_leaf())) {
                this.tree.expanded[this.path] = this;
                this.expand_children(selected, expanded);
            }
        },
        _get_column_td: function(column_index, row) {
            row = row || this.el;
            var child_offset = 0;
            if (this.tree.selection_mode != Sao.common.SELECTION_NONE) {
                child_offset += 1;
            }
            return jQuery(row.children()[column_index + child_offset]);
        },
        is_leaf: function(){
            return !this.record.model.fields.hasOwnProperty(this.children_field);
        },
        redraw: function(selected, expanded) {
            selected = selected || [];
            expanded = expanded || [];
            // [Bug Sao] hide expander when elem is leaf
            var update_expander = function() {
                if (this.is_leaf() || jQuery.isEmptyObject(
                        this.record.field_get(this.children_field))){
                    this.expander.css('visibility', 'hidden');
                }
            };

            for (var i = 0; i < this.tree.columns.length; i++) {
                if ((i === 0) && this.children_field) {
                    if (!this.is_leaf())
                        this.record.load(this.children_field).done(
                            update_expander.bind(this));
                    else
                        this.record.load('*').done(
                            update_expander.bind(this));
                }
                var column = this.tree.columns[i];
                var td = this._get_column_td(i);
                var tr = td.find('tr');
                if (column.prefixes) {
                    for (var j = 0; j < column.prefixes.length; j++) {
                        var prefix = column.prefixes[j];
                        jQuery(tr.children('.prefix')[j])
                            .html(prefix.render(this.record));
                    }
                }
                jQuery(tr.children('.widget')).html(column.render(this.record));
                if (column.suffixes) {
                    for (var k = 0; k < column.suffixes.length; k++) {
                        var suffix = column.suffixes[k];
                        jQuery(tr.children('.suffix')[k])
                            .html(suffix.render(this.record));
                    }
                }
                if (column.attributes.tree_invisible ||
                        column.header.css('display') == 'none') {
                    td.hide();
                } else {
                    td.show();
                }
            }
            var row_id_path = this.get_id_path();
            this.set_selection(Sao.common.contains(selected, row_id_path));
            if (this.is_expanded() ||
                    Sao.common.contains(expanded, row_id_path)) {
                this.tree.expanded[this.path] = this;
                if (!this.record._values[this.children_field] ||
                        (this.record._values[this.children_field].length > 0 &&
                         this.rows.length === 0)) {
                    this.expand_children(selected, expanded);
                } else {
                    var child_row;
                    for (i = 0; i < this.rows.length; i++) {
                        child_row = this.rows[i];
                        child_row.redraw(selected, expanded);
                    }
                }
                if (this.expander) {
                    this.update_expander(true);
                }
            } else {
                if (this.expander) {
                    this.update_expander(false);
                }
            }
            if (this.record.deleted() || this.record.removed()) {
                this.el.css('text-decoration', 'line-through');
            } else {
                this.el.css('text-decoration', 'inherit');
            }
        },
        toggle_row: function() {
            if (this.is_expanded()) {
                this.update_expander(false);
                delete this.tree.expanded[this.path];
                this.collapse_children();
            } else {
                this.update_expander(true);
                this.tree.expanded[this.path] = this;
                this.expand_children();
            }
            return false;
        },
        update_expander: function(expanded) {
            if (expanded) {
                this.expander.removeClass('glyphicon-plus');
                this.expander.addClass('glyphicon-minus');
            } else {
                this.expander.removeClass('glyphicon-minus');
                this.expander.addClass('glyphicon-plus');
            }
        },
        collapse_children: function() {
            this.rows.forEach(function(row, pos, rows) {
                row.collapse_children();
                var node = row.el[0];
                node.parentNode.removeChild(node);
            });
            this.rows = [];
        },
        expand_children: function(selected, expanded) {
            var add_children = function() {
                if (!jQuery.isEmptyObject(this.rows)) {
                    return;
                }
                var add_row = function(record, pos, group) {
                    var tree_row = new this.Class(
                            this.tree, record, pos, this);
                    tree_row.construct(selected, expanded);
                    tree_row.redraw(selected, expanded);
                    this.rows.push(tree_row);
                };
                var children = this.record.field_get_client(
                        this.children_field);
                if (children.model.name != this.record.model.name)
                    children.model.add_fields(this.children_definitions[children.model.name]);
                children.forEach(add_row.bind(this));
            };
            return this.record.load(this.children_field).done(
                    add_children.bind(this));
        },
        switch_row: function() {
            if (window.getSelection) {
                if (window.getSelection().empty) {  // Chrome
                    window.getSelection().empty();
                } else if (window.getSelection().removeAllRanges) {  // Firefox
                    window.getSelection().removeAllRanges();
                }
            } else if (document.selection) {  // IE?
                document.selection.empty();
            }
            if (this.tree.selection_mode != Sao.common.SELECTION_NONE) {
                this.set_selection(true);
                this.selection_changed();
                if (!this.is_selected()) {
                    return;
                }
            }
            this.tree.switch_(this.path);
        },
        set_multi_level_selection: function(value){
            this.set_selection(value);
            this.rows.forEach(function(row){
                row.set_multi_level_selection(value);
            });
        },
        select_row: function(event_) {
            if (this.tree.selection_mode == Sao.common.SELECTION_NONE) {
                this.tree.select_changed(this.record);
                this.switch_row();
            } else {
                if (!event_.ctrlKey &&
                        this.tree.selection_mode ==
                        Sao.common.SELECTION_SINGLE) {
                    this.tree.rows.forEach(function(row) {
                        // [Bug Sao] call set_selection on child rows as well
                        row.set_multi_level_selection(false);
                    }.bind(this));
                }
                this.set_selection(!this.is_selected());
                this.selection_changed();
            }

            // The 'click'-event must be handled next time the row is clicked
            var td = event_.data.td;
            var column = event_.data.column;
            td.on('click keypress', {column: column, td: td},
                    Sao.common.click_press(this.select_row.bind(this), true));
        },
        is_selected: function() {
            if (this.tree.selection_mode == Sao.common.SELECTION_NONE) {
                return false;
            }
            return this.selection.prop('checked');
        },
        set_selection: function(value) {
            if (this.tree.selection_mode == Sao.common.SELECTION_NONE) {
                return;
            }
            this.selection.prop('checked', value);
            this.el.toggleClass('row-active', value);
            if (!value) {
                this.tree.selection.prop('checked', false);
            }
        },
        selection_changed: function() {
            var is_selected = this.is_selected();
            this.set_selection(is_selected);
            if (is_selected) {
                this.tree.select_changed(this.record);
            } else {
                this.tree.select_changed(
                        this.tree.selected_records()[0] || null);
            }
            this.tree.update_selection();
        },
        record_to_path: function(record) {
            // recursively get the path to the record
            var i, path;
            if (record == this.record) {
                return [];
            } else {
                for (i = 0; i < this.rows.length; i++) {
                    path = this.rows[i].record_to_path(record);
                    if (path) {
                        path.unshift(i);
                        return path;
                    }
                }
            }
        },
        expand_to_path: function(path) {
            var row_idx, rest;
            row_idx = path[0];
            rest = path.slice(1);
            if (rest.length > 0) {
                this.rows[row_idx].expand_children().done(function() {
                    this.rows[row_idx].expand_to_path(rest);
                }.bind(this));
            }
        },
        next_column: function(path, editable, sign) {
            var i, readonly, invisible;
            var column, column_index, state_attrs;

            sign = sign || 1;
            if ((path === null) && (sign > 0)) {
                path = -1;
            } else if (path === null) {
                path = 0;
            }
            column_index = 0;
            for (i = 0; i < this.tree.columns.length; i++) {
                column_index = ((path + (sign * (i + 1))) %
                        this.tree.columns.length);
                // javascript modulo returns negative number for negative
                // numbers
                if (column_index < 0) {
                    column_index += this.tree.columns.length;
                }
                column = this.tree.columns[column_index];
                state_attrs = column.field.get_state_attrs(this.record);
                invisible = state_attrs.invisible;
                if (column.attributes.tree_invisible) {
                    invisible = true;
                }
                if (editable) {
                    readonly = (column.attributes.readonly ||
                            state_attrs.readonly);
                } else {
                    readonly = false;
                }
                if (!(invisible || readonly)) {
                    return column_index;
                }
            }
        }
    });

    Sao.View.Tree.RowEditable = Sao.class_(Sao.View.Tree.Row, {
        init: function(tree, record, pos, parent) {
            Sao.View.Tree.RowEditable._super.init.call(this, tree, record, pos,
                parent);
            this.edited_column = null;
        },
        redraw: function(selected, expanded) {
            var i, tr, td, widget;
            var field;

            Sao.View.Tree.RowEditable._super.redraw.call(this, selected,
                    expanded);
            // The autocompletion widget do not call display thus we have to
            // call it when redrawing the row
            for (i = 0; i < this.tree.columns.length; i++) {
                td = this._get_column_td(i);
                tr = td.find('tr');
                widget = jQuery(tr.children('.widget-editable')).data('widget');
                if (widget) {
                    field = this.record.model.fields[widget.field_name];
                    widget.display(this.record, field);
                }
            }
        },
        select_row: function(event_) {
            var previously_selected, previous_td;
            var inner_rows, readonly_row, editable_row, current_td;
            var field, widget;

            function get_previously_selected(rows, selected) {
                var i, r;
                for (i = 0; i < rows.length; i++) {
                    r = rows[i];
                    if (r.is_selected()) {
                        previously_selected = r;
                    }
                    if (r != selected) {
                        r.set_selection(false);
                    }
                    get_previously_selected(r.rows, selected);
                }
            }
            get_previously_selected(this.tree.rows, this);
            this.selection_changed();

            var save_prm;
            if (previously_selected && previously_selected != this &&
                    !this.tree.screen.group.parent) {
                save_prm = previously_selected.record.save();
            } else {
                save_prm = jQuery.when();
            }
            save_prm.done(function () {
                if (previously_selected &&
                        previously_selected.edited_column !== null) {
                    previous_td = previously_selected.get_active_td();
                    previous_td.on('click keypress', {
                        td: previous_td,
                        column: previously_selected.edited_column
                    }, Sao.common.click_press(
                        previously_selected.select_row.bind(previously_selected),
                        true));
                    var previous_column = this.tree.columns[
                        previously_selected.edited_column];
                    previously_selected.get_static_el()
                        .html(previous_column.render(previously_selected.record))
                        .show();
                    previously_selected.empty_editable_el();
                }
                if (this.is_selected()) {
                    this.edited_column = event_.data.column;
                    current_td = this.get_active_td();
                    var attributes = this.tree.columns[this.edited_column]
                        .attributes;
                    var EditableBuilder = Sao.View.editabletree_widget_get(
                        attributes.widget);
                    widget = new EditableBuilder(attributes.name,
                            this.tree.screen.model, attributes);
                    widget.view = this.tree;
                    // We have to define an overflow:visible in order for the
                    // completion widget to be shown
                    widget.el.on('focusin', function() {
                        jQuery(this).parents('.treeview td')
                            .css('overflow', 'visible');
                    });
                    widget.el.on('focusout', function() {
                        jQuery(this).parents('.treeview td')
                            .css('overflow', 'hidden');
                    });
                    var editable_el = this.get_editable_el();
                    editable_el.append(widget.el);
                    editable_el.data('widget', widget);
                    // We use keydown to be able to catch TAB events
                    widget.el.on('keydown', this.key_press.bind(this));
                    field = this.record.model.fields[widget.field_name];
                    widget.display(this.record, field);
                    this.get_static_el().hide();
                    this.get_editable_el().show();
                    widget.el.focus();
                } else {
                    this.set_selection(true);
                    this.selection_changed();
                    var td = event_.data.td;
                    var column = event_.data.column;
                    td.on('click keypress', {column: column, td: td},
                        Sao.common.click_press(this.select_row.bind(this),
                            true));
                }
            }.bind(this));
        },
        get_static_el: function() {
            var td = this.get_active_td();
            return td.find('.widget');
        },
        get_editable_el: function() {
            var td = this.get_active_td();
            var editable = td.find('.widget-editable');
            if (!editable.length) {
                editable = jQuery('<td/>', {
                        'class': 'widget-editable'
                    }).insertAfter(td.find('.widget'));
            }
            return editable;
        },
        empty_editable_el: function() {
            var editable;
            editable = this.get_editable_el();
            editable.empty();
            editable.data('widget', null);
            this.edited_column = null;
        },
        get_active_td: function() {
            return this._get_column_td(this.edited_column);
        },
        key_press: function(event_) {
            var current_td, selector, next_column, next_idx, i, next_row;
            var states;

            if ((event_.which != Sao.common.TAB_KEYCODE) &&
                    (event_.which != Sao.common.UP_KEYCODE) &&
                    (event_.which != Sao.common.DOWN_KEYCODE) &&
                    (event_.which != Sao.common.ESC_KEYCODE) &&
                    (event_.which != Sao.common.RETURN_KEYCODE)) {
                return;
            }
            var column = this.tree.columns[this.edited_column];
            if (column.field.validate(this.record)) {
                if (event_.which == Sao.common.TAB_KEYCODE) {
                    var sign = 1;
                    if (event_.shiftKey) {
                        sign = -1;
                    }
                    event_.preventDefault();
                    next_idx = this.next_column(this.edited_column, true, sign);
                    if (next_idx !== null) {
                        window.setTimeout(function() {
                            var td = this._get_column_td(next_idx);
                            td.triggerHandler('click', {
                                column: next_idx,
                                td: td
                            });
                        }.bind(this), 0);
                    }
                } else if (event_.which == Sao.common.UP_KEYCODE ||
                    event_.which == Sao.common.DOWN_KEYCODE) {
                    if (event_.which == Sao.common.UP_KEYCODE) {
                        next_row = this.el.prev('tr');
                    } else {
                        next_row = this.el.next('tr');
                    }
                    next_column = this.edited_column;
                    this.record.validate(this.tree.get_fields())
                        .then(function(validate) {
                            if (!validate) {
                                next_row = null;
                                var invalid_fields =
                                    this.record.invalid_fields();
                                for (i = 0; i < this.tree.columns.length; i++) {
                                    var col = this.tree.columns[i];
                                    if (col.attributes.name in invalid_fields) {
                                        next_column = i;
                                    }
                                }
                            } else {
                                if (this.tree.screen.attributes.pre_validate) {
                                    return this.record.pre_validate()
                                        .fail(function() {
                                            next_row = null;
                                        });
                                } else if (!this.tree.screen.model.parent) {
                                    return this.record.save()
                                        .fail(function() {
                                            next_row = null;
                                        });
                                }
                            }
                        }.bind(this)).then(function() {
                            window.setTimeout(function() {
                                this._get_column_td(next_column, next_row)
                                .trigger('click').trigger('click');
                            }.bind(this), 0);
                        }.bind(this));
                } else if (event_.which == Sao.common.ESC_KEYCODE) {
                    this.get_static_el().show();
                    current_td = this.get_active_td();
                    current_td.on('click keypress',
                            {column: this.edited_column, td: current_td},
                            Sao.common.click_press(this.select_row.bind(this),
                                true));
                    this.empty_editable_el();
                } else if (event_.which == Sao.common.RETURN_KEYCODE) {
                    var focus_cell = function(row) {
                        var td = this._get_column_td(this.edited_column, row);
                        td.triggerHandler('click');
                        td.triggerHandler('click');
                    }.bind(this);
                    if (this.tree.attributes.editable == 'bottom') {
                        next_row = this.el.next('tr');
                    } else {
                        next_row = this.el.prev('tr');
                    }
                    if (next_row.length) {
                        focus_cell(next_row);
                    } else {
                        // TODO access and size_limit
                        this.tree.screen.new_().done(function() {
                            var new_row;
                            var rows = this.tree.tbody.children('tr');
                            if (this.tree.attributes.editable == 'bottom') {
                                new_row = rows.last();
                            } else {
                                new_row = rows.first();
                            }
                            focus_cell(new_row);
                        }.bind(this));
                    }
                }
            }
        }
    });

    Sao.View.Tree.Affix = Sao.class_(Object, {
        init: function(attributes, protocol) {
            this.attributes = attributes;
            this.protocol = protocol || null;
            this.icon = attributes.icon;
            if (this.protocol && !this.icon) {
                this.icon = 'tryton-web-browser';
            }
        },
        get_cell: function() {
            var cell;
            if (this.protocol) {
                cell = jQuery('<a/>', {
                    'target': '_new'
                });
                cell.append(jQuery('<img/>'));
                cell.click({'cell': cell}, this.clicked.bind(this));
            } else if (this.icon) {
                cell = jQuery('<img/>');
            } else {
                cell = jQuery('<span/>');
                cell.attr('tabindex', 0);
            }
            cell.addClass('column-affix');
            return cell;
        },
        render: function(record) {
            var cell = this.get_cell();
            record.load(this.attributes.name).done(function() {
                var value, icon_prm;
                var field = record.model.fields[this.attributes.name];
                var invisible = field.get_state_attrs(record).invisible;
                if (invisible) {
                    cell.hide();
                } else {
                    cell.show();
                }
                if (this.protocol) {
                    value = field.get(record);
                    if (!jQuery.isEmptyObject(value)) {
                        switch (this.protocol) {
                            case 'email':
                                value = 'mailto:' + value;
                                break;
                            case 'callto':
                                value = 'callto:' + value;
                                break;
                            case 'sip':
                                value = 'sip:' + value;
                                break;
                        }
                    }
                    cell.attr('src', value);
                }
                if (this.icon) {
                    if (this.icon in record.model.fields) {
                        var icon_field = record.model.fields[this.icon];
                        value = icon_field.get_client(record);
                    }
                    else {
                        value = this.icon;
                    }
                    icon_prm = Sao.common.ICONFACTORY.register_icon(value);
                    icon_prm.done(function(url) {
                        var img_tag;
                        if (cell.children('img').length) {
                            img_tag = cell.children('img');
                        } else {
                            img_tag = cell;
                        }
                        img_tag.attr('src', url);
                    }.bind(this));
                } else {
                    value = this.attributes.string || '';
                    if (!value) {
                        value = field.get_client(record) || '';
                    }
                    cell.text(value);
                }
            }.bind(this));
            return cell;
        },
        clicked: function(event) {
            event.preventDefault();  // prevent edition
            window.open(event.data.cell.attr('src'), '_blank');
        }
    });

    Sao.View.Tree.CharColumn = Sao.class_(Object, {
        class_: 'column-char',
        init: function(model, attributes) {
            this.type = 'field';
            this.model = model;
            this.field = model.fields[attributes.name];
            this.attributes = attributes;
            this.prefixes = [];
            this.suffixes = [];
            this.header = null;
        },
        get_cell: function() {
            // [Bug Sao] indentations in rich text
            var cell = jQuery('<div/>', {
                'class': this.class_ + ' pre',
                'tabindex': 0
            });
            return cell;
        },
        update_text: function(cell, record) {
            cell.text(this.field.get_client(record));
        },
        render: function(record) {
            var cell = this.get_cell();
            record.load(this.attributes.name).done(function() {
                this.update_text(cell, record);
                this.field.set_state(record);
                var state_attrs = this.field.get_state_attrs(record);
                if (state_attrs.invisible) {
                    cell.hide();
                } else {
                    cell.show();
                }
            }.bind(this));
            return cell;
        }
    });

    Sao.View.Tree.TextColum = Sao.class_(Sao.View.Tree.CharColumn, {
        class_: 'column-text'
    });

    Sao.View.Tree.IntegerColumn = Sao.class_(Sao.View.Tree.CharColumn, {
        class_: 'column-integer',
        init: function(model, attributes) {
            Sao.View.Tree.IntegerColumn._super.init.call(this, model, attributes);
            this.factor = Number(attributes.factor || 1);
        },
        get_cell: function() {
            return Sao.View.Tree.IntegerColumn._super.get_cell.call(this);
        },
        update_text: function(cell, record) {
            cell.text(this.field.get_client(record, this.factor));
        }
    });

    Sao.View.Tree.FloatColumn = Sao.class_(Sao.View.Tree.IntegerColumn, {
        class_: 'column-float'
    });

    Sao.View.Tree.BooleanColumn = Sao.class_(Sao.View.Tree.CharColumn, {
        class_: 'column-boolean',
        get_cell: function() {
            return jQuery('<input/>', {
                'type': 'checkbox',
                'disabled': true,
                'class': this.class_,
                'tabindex': 0
            });
        },
        update_text: function(cell, record) {
            cell.prop('checked', this.field.get(record));
        }
    });

    Sao.View.Tree.Many2OneColumn = Sao.class_(Sao.View.Tree.CharColumn, {
        class_: 'column-many2one'
    });

    Sao.View.Tree.One2OneColumn = Sao.class_(Sao.View.Tree.Many2OneColumn, {
        class_: 'column-one2one'
    });

    Sao.View.Tree.SelectionColumn = Sao.class_(Sao.View.Tree.CharColumn, {
        class_: 'column-selection',
        init: function(model, attributes) {
            Sao.View.Tree.SelectionColumn._super.init.call(this, model,
                attributes);
            Sao.common.selection_mixin.init.call(this);
            this.init_selection();
        },
        init_selection: function(key) {
            Sao.common.selection_mixin.init_selection.call(this, key);
        },
        update_selection: function(record, callback) {
            Sao.common.selection_mixin.update_selection.call(this, record,
                this.field, callback);
        },
        update_text: function(cell, record) {
            this.update_selection(record, function() {
                var value = this.field.get(record);
                var prm, text, found = false;
                for (var i = 0, len = this.selection.length; i < len; i++) {
                    if (this.selection[i][0] === value) {
                        found = true;
                        text = this.selection[i][1];
                        break;
                    }
                }
                if (!found) {
                    prm = Sao.common.selection_mixin.get_inactive_selection
                        .call(this, value).then(function(inactive) {
                            return inactive[1];
                        });
                } else {
                    prm = jQuery.when(text);
                }
                prm.done(function(text_value) {
                    cell.text(text_value);
                }.bind(this));
            }.bind(this));
        }
    });

    Sao.View.Tree.ReferenceColumn = Sao.class_(Sao.View.Tree.CharColumn, {
        class_: 'column-reference',
        init: function(model, attributes) {
            Sao.View.Tree.ReferenceColumn._super.init.call(this, model,
                attributes);
            Sao.common.selection_mixin.init.call(this);
            this.init_selection();
        },
        init_selection: function(key) {
            Sao.common.selection_mixin.init_selection.call(this, key);
        },
        update_selection: function(record, callback) {
            Sao.common.selection_mixin.update_selection.call(this, record,
                this.field, callback);
        },
        update_text: function(cell, record) {
            this.update_selection(record, function() {
                var value = this.field.get_client(record);
                var model, name;
                if (!value) {
                    model = '';
                    name = '';
                } else {
                    model = value[0];
                    name = value[1];
                }
                if (model) {
                    cell.text(this.selection[model] || model + ',' + name);
                } else {
                    cell.text(name);
                }
            }.bind(this));
        }
    });

    Sao.View.Tree.DateColumn = Sao.class_(Sao.View.Tree.CharColumn, {
        class_: 'column-date',
        update_text: function(cell, record) {
            var value = this.field.get_client(record);
            var date_format = this.field.date_format(record);
            cell.text(Sao.common.format_date(date_format, value));
        }
    });

    Sao.View.Tree.TimeColumn = Sao.class_(Sao.View.Tree.CharColumn, {
        class_: 'column-time',
        update_text: function(cell, record) {
            var value = this.field.get_client(record);
            cell.text(Sao.common.format_time(
                    this.field.time_format(record), value));
        }
    });

    Sao.View.Tree.TimeDeltaColumn = Sao.class_(Sao.View.Tree.CharColumn, {
        class_: 'column-timedelta'
    });

    Sao.View.Tree.One2ManyColumn = Sao.class_(Sao.View.Tree.CharColumn, {
        class_: 'column-one2many',
        update_text: function(cell, record) {
            cell.text('( ' + this.field.get_client(record).length + ' )');
        }
    });

    Sao.View.Tree.Many2ManyColumn = Sao.class_(Sao.View.Tree.One2ManyColumn, {
        class_: 'column-many2many'
    });

    Sao.View.Tree.BinaryColumn = Sao.class_(Sao.View.Tree.CharColumn, {
        class_: 'column-binary',
        update_text: function(cell, record) {
            cell.text(Sao.common.humanize(this.field.get_size(record)));
        }
    });

    Sao.View.Tree.ImageColumn = Sao.class_(Sao.View.Tree.CharColumn, {
        class_: 'column-image',
        get_cell: function() {
            var cell = jQuery('<img/>', {
                'class': this.class_,
                'tabindex': 0
            });
            cell.css('width', '100%');
            return cell;
        },
        render: function(record) {
            var cell = this.get_cell();
            record.load(this.attributes.name).done(function() {
                var value = this.field.get_client(record);
                if (value) {
                    if (value > Sao.common.BIG_IMAGE_SIZE) {
                        value = jQuery.when(null);
                    } else {
                        value = this.field.get_data(record);
                    }
                } else {
                    value = jQuery.when(null);
                }
                value.done(function(data) {
                    var img_url, blob;
                    if (!data) {
                        img_url = null;
                    } else {
                        blob = new Blob([data]);
                        img_url = window.URL.createObjectURL(blob);
                    }
                    cell.attr('src', img_url);
                }.bind(this));
            }.bind(this));
            return cell;
        }
    });

    Sao.View.Tree.URLColumn = Sao.class_(Sao.View.Tree.CharColumn, {
        class_: 'column-url',
        render: function(record) {
            var cell = Sao.View.Tree.URLColumn._super.render.call(this, record);
            this.field.set_state(record);
            var state_attrs = this.field.get_state_attrs(record);
            if (state_attrs.readonly) {
                cell.hide();
            } else {
                cell.show();
            }
        }
    });

    Sao.View.Tree.ProgressBar = Sao.class_(Sao.View.Tree.CharColumn, {
        class_: 'column-progressbar',
        get_cell: function() {
            var cell = jQuery('<div/>', {
                'class': this.class_ + ' progress',
                'tabindex': 0
            });
            var progressbar = jQuery('<div/>', {
                'class': 'progress-bar',
                'role': 'progressbar',
                'aria-valuemin': 0,
                'aria-valuemax': 100
            }).appendTo(cell);
            progressbar.css('min-width: 2em');
            return cell;
        },
        update_text: function(cell, record) {
            var text = this.field.get_client(record, 100);
            if (text) {
                text = Sao.i18n.gettext('%1%', text);
            }
            var value = this.field.get(record) || 0;
            var progressbar = cell.find('.progress-bar');
            progressbar.attr('aria-valuenow', value * 100);
            progressbar.css('width', value * 100 + '%');
            progressbar.text(text);
        }
    });

    Sao.View.Tree.ButtonColumn = Sao.class_(Object, {
        init: function(screen, attributes) {
            this.screen = screen;
            this.type = 'button';
            this.attributes = attributes;
        },
        render: function(record) {
            var button = new Sao.common.Button(this.attributes);
            button.el.click([record, button], this.button_clicked.bind(this));
            var fields = jQuery.map(this.screen.model.fields,
                function(field, name) {
                    if ((field.description.loading || 'eager') ==
                        'eager') {
                        return name;
                    } else {
                        return undefined;
                    }
                });
            // Wait at least one eager field is loaded before evaluating states
            record.load(fields[0]).done(function() {
                button.set_state(record);
            });
            return button.el;
        },
        button_clicked: function(event) {
            var record = event.data[0];
            var button = event.data[1];
            if (record != this.screen.current_record) {
                return;
            }
            var states = record.expr_eval(this.attributes.states || {});
            if (states.invisible || states.readonly) {
                return;
            }
            button.el.prop('disabled', true);
            try {
                this.screen.button(this.attributes);
            } finally {
                button.el.prop('disabled', false);
            }
        }
    });

    Sao.View.editabletree_widget_get = function(type) {
        switch (type) {
            case 'char':
            case 'text':
            case 'url':
            case 'email':
            case 'callto':
            case 'sip':
                return Sao.View.EditableTree.Char;
            case 'date':
                return Sao.View.EditableTree.Date;
            case 'time':
                return Sao.View.EditableTree.Time;
            case 'timedelta':
                return Sao.View.EditableTree.TimeDelta;
            case 'integer':
            case 'biginteger':
                return Sao.View.EditableTree.Integer;
            case 'float':
            case 'numeric':
                return Sao.View.EditableTree.Float;
            case 'selection':
                return Sao.View.EditableTree.Selection;
            case 'boolean':
                return Sao.View.EditableTree.Boolean;
            case 'many2one':
                return Sao.View.EditableTree.Many2One;
            case 'reference':
                return Sao.View.EditableTree.Reference;
            case 'one2one':
                return Sao.View.EditableTree.One2One;
            case 'one2many':
            case 'many2many':
                return Sao.View.EditableTree.One2Many;
            case 'binary':
                return Sao.View.EditableTree.Binary;
        }
    };

    Sao.View.EditableTree = {};

    Sao.View.EditableTree.editable_mixin = function(widget) {
        var key_press = function(event_) {
            if ((event_.which == Sao.common.TAB_KEYCODE) ||
                    (event_.which == Sao.common.UP_KEYCODE) ||
                    (event_.which == Sao.common.DOWN_KEYCODE) ||
                    (event_.which == Sao.common.ESC_KEYCODE) ||
                    (event_.which == Sao.common.RETURN_KEYCODE)) {
                this.focus_out();
            }
        };
        widget.el.on('keydown', key_press.bind(widget));
    };

    Sao.View.EditableTree.Char = Sao.class_(Sao.View.Form.Char, {
        class_: 'editabletree-char',
        init: function(field_name, model, attributes) {
            Sao.View.EditableTree.Char._super.init.call(this, field_name,
                model, attributes);
            Sao.View.EditableTree.editable_mixin(this);
        }
    });

    Sao.View.EditableTree.Date = Sao.class_(Sao.View.Form.Date, {
        class_: 'editabletree-date',
        init: function(field_name, model, attributes) {
            Sao.View.EditableTree.Date._super.init.call(this, field_name,
                model, attributes);
            Sao.View.EditableTree.editable_mixin(this);
        }
    });

    Sao.View.EditableTree.Time = Sao.class_(Sao.View.Form.Time, {
        class_: 'editabletree-time',
        init: function(field_name, model, attributes) {
            Sao.View.EditableTree.Time._super.init.call(this, field_name,
                model, attributes);
            Sao.View.EditableTree.editable_mixin(this);
        }
    });

    Sao.View.EditableTree.TimeDelta = Sao.class_(Sao.View.Form.TimeDelta, {
        class_: 'editabletree-timedelta',
        init: function(field_name, model, attributes) {
            Sao.View.EditableTree.TimeDelta._super.init.call(this, field_name,
                model, attributes);
            Sao.View.EditableTree.editable_mixin(this);
        }
    });

    Sao.View.EditableTree.Integer = Sao.class_(Sao.View.Form.Integer, {
        class_: 'editabletree-integer',
        init: function(field_name, model, attributes) {
            Sao.View.EditableTree.Integer._super.init.call(this, field_name,
                model, attributes);
            Sao.View.EditableTree.editable_mixin(this);
        }
    });

    Sao.View.EditableTree.Float = Sao.class_(Sao.View.Form.Float, {
        class_: 'editabletree-float',
        init: function(field_name, model, attributes) {
            Sao.View.EditableTree.Float._super.init.call(this, field_name,
                model, attributes);
            Sao.View.EditableTree.editable_mixin(this);
        }
    });

    Sao.View.EditableTree.Selection = Sao.class_(Sao.View.Form.Selection, {
        class_: 'editabletree-selection',
        init: function(field_name, model, attributes) {
            Sao.View.EditableTree.Selection._super.init.call(this, field_name,
                model, attributes);
            Sao.View.EditableTree.editable_mixin(this);
        }
    });

    Sao.View.EditableTree.Boolean = Sao.class_(Sao.View.Form.Boolean, {
        class_: 'editabletree-boolean',
        init: function(field_name, model, attributes) {
            Sao.View.EditableTree.Boolean._super.init.call(this, field_name,
                model, attributes);
            Sao.View.EditableTree.editable_mixin(this);
        }
    });

    Sao.View.EditableTree.Many2One = Sao.class_(Sao.View.Form.Many2One, {
        class_: 'editabletree-many2one',
        init: function(field_name, model, attributes) {
            Sao.View.EditableTree.Many2One._super.init.call(this, field_name,
                model, attributes);
            this.el.on('keydown', this.key_press.bind(this));
        },
        key_press: function(event_) {
            if (event_.which == Sao.common.TAB_KEYCODE) {
                this.focus_out();
            } else {
                Sao.View.EditableTree.Many2One._super.key_press.call(this,
                    event_);
            }
        }
    });

    Sao.View.EditableTree.Reference = Sao.class_(Sao.View.Form.Reference, {
        class_: 'editabletree-reference',
        init: function(field_name, model, attributes) {
            Sao.View.EditableTree.Reference._super.init.call(this, field_name,
                model, attributes);
            this.el.on('keydown', this.key_press.bind(this));
        },
        key_press: function(event_) {
            if (event_.which == Sao.common.TAB_KEYCODE) {
                this.focus_out();
            } else {
                Sao.View.EditableTree.Reference._super.key_press.call(this,
                    event_);
            }
        }
    });

    Sao.View.EditableTree.One2One = Sao.class_(Sao.View.Form.One2One, {
        class_: 'editabletree-one2one',
        init: function(field_name, model, attributes) {
            Sao.View.EditableTree.One2One._super.init.call(this, field_name,
                model, attributes);
            this.el.on('keydown', this.key_press.bind(this));
        },
        key_press: function(event_) {
            if (event_.which == Sao.common.TAB_KEYCODE) {
                this.focus_out();
            } else {
                Sao.View.EditableTree.One2One._super.key_press.call(this,
                    event_);
            }
        }
    });

    Sao.View.EditableTree.One2Many = Sao.class_(Sao.View.EditableTree.Char, {
        class_: 'editabletree-one2many',
        init: function(field_name, model, attributes) {
            Sao.View.EditableTree.One2Many._super.init.call(this, field_name,
                model, attributes);
        },
        display: function(record, field) {
            if (record) {
                this.el.val('(' + field.get_client(record).length + ')');
            } else {
                this.el.val('');
            }
        },
        key_press: function(event_) {
            if (event_.which == Sao.common.TAB_KEYCODE) {
                this.focus_out();
            }
        },
        set_value: function(record, field) {
        }
    });

    Sao.View.EditableTree.Binary = Sao.class_(Sao.View.Form.Binary, {
        class_: 'editabletree-binary',
        init: function(field_name, model, attributes) {
            Sao.View.EditableTree.Binary._super.init.call(this, field_name,
                model, attributes);
            Sao.View.EditableTree.editable_mixin(this);
        }
    });

}());

/* This file is part of Tryton.  The COPYRIGHT file at the top level of
   this repository contains the full copyright notices and license terms. */
(function() {
    'use strict';

    Sao.View.Graph = Sao.class_(Sao.View, {
        init: function(screen, xml) {
            Sao.View.Graph._super.init.call(this, screen, xml);
            this.view_type = 'graph';
            this.el = jQuery('<div/>', {
                'class': 'graph'
            });
            this.widgets = {};
            this.widget = this.parse(xml.children()[0]);
            this.widgets.root = this.widget;
            this.el.append(this.widget.el);
        },
        parse: function(node) {
            var field, xfield = null, yfields = [], yattrs;
            var child, node_child;
            var i, len, j, c_len;

            var get_attributes = function(node) {
                var attributes = {}, attribute;
                for (var i = 0, len = node.attributes.length; i < len; i++) {
                    attribute = node.attributes[i];
                    attributes[attribute.name] = attribute.value;
                }
                return attributes;
            };

            for (i=0, len=node.children.length; i < len; i++) {
                child = node.children[i];
                switch (child.tagName) {
                    case 'x':
                        for (j=0, c_len=child.children.length; j < c_len; j++) {
                            xfield = get_attributes(child.children[j]);
                            field = this.screen.model.fields[xfield.name];
                            if (!(xfield.string || '')) {
                                xfield.string = field.description.string;
                            }
                        }
                        break;
                    case 'y':
                        for (j=0, c_len=child.children.length; j < c_len; j++) {
                            yattrs = get_attributes(child.children[j]);
                            if (!(yattrs.string || '') &&
                                    (yattrs.name != '#')) {
                                field = this.screen.model.fields[yattrs.name];
                                yattrs.string = field.description.string;
                            }
                            yfields.push(yattrs);
                        }
                        break;
                }
            }

            var Widget;
            switch (this.attributes.type) {
                case 'hbar':
                    Widget = Sao.View.Graph.HorizontalBar;
                    break;
                case 'line':
                    Widget = Sao.View.Graph.Line;
                    break;
                case 'pie':
                    Widget = Sao.View.Graph.Pie;
                    break;
                default:
                    Widget = Sao.View.Graph.VerticalBar;
            }
            return new Widget(this, xfield, yfields);
        },
        display: function() {
            return this.widget.display(this.screen.group);
        }
    });

    Sao.View.Graph.Chart = Sao.class_(Object, {
        _chart_type: undefined,

        init: function(view, xfield, yfields) {
            this.view = view;
            this.xfield = xfield;
            this.yfields = yfields;
            this.el = jQuery('<div/>');
            this.el.uniqueId();
        },
        update_data: function(group) {
            var data = {};
            var record, yfield, key;
            var i, len, j, y_len;

            this.ids = {};
            data.columns = [['labels']];
            data.names = {};
            var key2columns = {};
            var fields2load = [this.xfield.name];
            for (i = 0, len = this.yfields.length; i < len; i++) {
                yfield = this.yfields[i];
                data.columns.push([yfield.name]);
                data.names[yfield.name] = yfield.string;
                key2columns[yfield.key || yfield.name] = i + 1;
                fields2load.push(yfield.name);
            }

            var prms = [];
            var set_data = function(index) {
                return function () {
                    record = group[index];
                    var x = record.field_get_client(this.xfield.name);
                    data.columns[0][index + 1] = x;
                    this._add_id(x, record.id);

                    var column;
                    for (j = 0, y_len = this.yfields.length; j < y_len; j++) {
                        yfield = this.yfields[j];
                        key = yfield.key || yfield.name;
                        column = data.columns[key2columns[key]];
                        if (yfield.domain) {
                            var ctx = jQuery.extend({},
                                    Sao.session.current_session.context);
                            ctx.context = ctx;
                            ctx._user = Sao.session.current_session.user_id;
                            for (var field in group.model.fields) {
                                ctx[field] = record.field_get(field);
                            }
                            var decoder = new Sao.PYSON.Decoder(ctx);
                            if (!decoder.decode(yfield.domain)) {
                                column[index + 1] = 0;
                                continue;
                            }
                        }
                        if (yfield.name == '#') {
                            column[index + 1] = 1;
                        } else {
                            var value = record.field_get(yfield.name);
                            if (value && value.isTimeDelta) {
                                value = value.asSeconds();
                            }
                            column[index + 1] = value || 0;
                        }
                    }
                }.bind(this);
            }.bind(this);
            var load_field = function(record) {
                return function(fname) {
                    prms.push(record.load(fname));
                };
            };

            var r_prms = [];
            for (i = 0, len = group.length; i < len; i++) {
                record = group[i];
                fields2load.forEach(load_field(group[i]));

                for (j = 0, y_len = data.columns.length; j < y_len; j++) {
                    data.columns[j].push(undefined);
                }
                r_prms.push(
                        jQuery.when.apply(jQuery, prms).then(set_data(i)));
            }
            return jQuery.when.apply(jQuery, r_prms).then(function() {
                return data;
            });
        },
        _add_id: function(key, id) {
            // c3 do not use the moment instance but its date repr when calling
            // onclick
            var id_x = (key.isDate || key.isDateTime) ? key._d : key;
            if (!(id_x in this.ids)) {
                this.ids[id_x] = [];
            }
            this.ids[id_x].push(id);
        },
        display: function(group) {
            var update_prm = this.update_data(group);
            update_prm.done(function(data) {
                c3.generate(this._c3_config(data));
            }.bind(this));
            return update_prm;
        },
        _c3_config: function(data) {
            var c3_config = {};

            c3_config.bindto = '#' + this.el.attr('id');
            c3_config.data = data;
            c3_config.data.type = this._chart_type;
            c3_config.data.x = 'labels';
            c3_config.data.onclick = this.action.bind(this);

            var i, len;
            var found, labels;
            for (i = 0, len = data.columns.length; i < len; i++) {
                labels = data.columns[i];
                if (labels[0] == 'labels') {
                    found = true;
                    break;
                }
            }
            if (found && (labels.length > 1) &&
                    (labels[1] && (labels[1].isDateTime || labels[1].isDate)))
            {
                var format_func, date_format, time_format;
                date_format = this.view.screen.context.date_format || '%x';
                time_format = '%X';
                if (labels[1].isDateTime) {
                    format_func = function(dt) {
                        return Sao.common.format_datetime(date_format,
                                time_format, moment(dt));
                    };
                } else {
                    format_func = function(dt) {
                        return Sao.common.format_date(date_format, moment(dt));
                    };
                }
                c3_config.axis = {
                    x: {
                        type: 'timeseries',
                        tick: {
                            format: format_func,
                        }
                    }
                };
            }
            return c3_config;
        },
        action: function(data, element) {
            var ids = this.ids[this._action_key(data)];
            var ctx = jQuery.extend({}, this.view.screen.context);
            delete ctx.active_ids;
            delete ctx.active_id;
            Sao.Action.exec_keyword('graph_open', {
                model: this.view.screen.model_name,
                id: ids[0],
                ids: ids
            }, ctx, false);
        },
        _action_key: function(data) {
            return data.x;
        }
    });

    Sao.View.Graph.VerticalBar = Sao.class_(Sao.View.Graph.Chart, {
        _chart_type: 'bar'
    });

    Sao.View.Graph.HorizontalBar = Sao.class_(Sao.View.Graph.Chart, {
        _chart_type: 'bar',
        _c3_config: function(data) {
            var config = Sao.View.Graph.HorizontalBar._super._c3_config
                .call(this, data);
            config.axis.rotated = true;
        }
    });

    Sao.View.Graph.Line = Sao.class_(Sao.View.Graph.Chart, {
        _chart_type: 'line'
    });

    Sao.View.Graph.Pie = Sao.class_(Sao.View.Graph.Chart, {
        _chart_type: 'pie',
        _c3_config: function(data) {
            var config = Sao.View.Graph.Pie._super._c3_config.call(this, data);
            var pie_columns = [], pie_names = {};
            var i, len;
            var labels, values;

            for (i = 0, len = data.columns.length; i < len; i++) {
                if (data.columns[i][0] == 'labels') {
                    labels = data.columns[i].slice(1);
                } else {
                    values = data.columns[i].slice(1);
                }
            }

            // Pie chart do not support axis definition.
            delete config.axis;
            delete config.data.x;
            var format_func, date_format, datetime_format;
            if ((labels.length > 0) &&
                    (labels[0].isDateTime || labels[0].isDate)) {
                date_format = this.view.screen.context.date_format || '%x';
                datetime_format = date_format + ' %X';
                if (labels[1].isDateTime) {
                    format_func = function(dt) {
                        return Sao.common.format_datetime(datetime_format, dt);
                    };
                } else {
                    format_func = function(dt) {
                        return Sao.common.format_date(date_format, dt);
                    };
                }
            }
            var label;
            for (i = 0, len = labels.length; i < len; i++) {
                label = labels[i];
                if (format_func) {
                    label = format_func(label);
                }
                pie_columns.push([i, values[i]]);
                pie_names[i] = label;
            }

            config.data.columns = pie_columns;
            config.data.names = pie_names;
            return config;
        },
        _add_id: function(key, id) {
            var id_x = key;
            if (key.isDateTime || key.isDate) {
                var date_format = this.view.screen.context.date_format || '%x';
                var datetime_format = date_format + ' %X';
                if (key.isDateTime) {
                    id_x = Sao.common.format_datetime(datetime_format, key);
                } else {
                    id_x = Sao.common.format_date(date_format, key);
                }
            }
            if (!(id_x in this.ids)) {
                this.ids[id_x] = [];
            }
            this.ids[id_x].push(id);
        },
        _action_key: function(data) {
            return data.id;
        }
    });

}());

/* This file is part of Tryton.  The COPYRIGHT file at the top level of
   this repository contains the full copyright notices and license terms. */
(function() {
    'use strict';

    Sao.View.Calendar = Sao.class_(Sao.View, {
        init: function(screen, xml) {
            Sao.View.Graph._super.init.call(this, screen, xml);
            this.view_type = 'calendar';
            this.el = jQuery('<div/>', {
                'class': 'calendar'
            });
            // TODO
            Sao.common.warning.run(
                    Sao.i18n.gettext('Calendar view not yet implemented'),
                    Sao.i18n.gettext('Warning'));
        },
        display: function() {
            return jQuery.when();
        }
    });

}());

/* This file is part of Tryton.  The COPYRIGHT file at the top level of
   this repository contains the full copyright notices and license terms. */
(function() {
    'use strict';

    Sao.Action = {
        report_blob_url: undefined
    };

    Sao.Action.exec_action = function(action, data, context) {
        if (context === undefined) {
            context = {};
        } else {
            context = jQuery.extend({}, context);
        }
        var session = Sao.Session.current_session;
        if (!('date_format' in context)) {
            if (session.context.locale && session.context.locale.date) {
                context.date_format = session.context.locale.date;
            }
        }
        if (data === undefined) {
            data = {};
        } else {
            data = jQuery.extend({}, data);
        }
        data.action_id = action.id;
        var params = {};
        switch (action.type) {
            case 'ir.action.act_window':
                params.view_ids = false;
                params.mode = null;
                if (!jQuery.isEmptyObject(action.views)) {
                    params.view_ids = [];
                    params.mode = [];
                    action.views.forEach(function(x) {
                        params.view_ids.push(x[0]);
                        params.mode.push(x[1]);
                    });
                } else if (!jQuery.isEmptyObject(action.view_id)) {
                    params.view_ids = [action.view_id[0]];
                }

                if (action.pyson_domain === undefined) {
                    action.pyson_domain = '[]';
                }
                var ctx = {
                    active_model: data.model || null,
                    active_id: data.id || null,
                    active_ids: data.ids
                };
                ctx = jQuery.extend(ctx, session.context);
                var eval_ctx = jQuery.extend({}, ctx);
                eval_ctx._user = session.user_id;
                params.context = jQuery.extend(
                        {}, context, new Sao.PYSON.Decoder(eval_ctx).decode(
                            action.pyson_context || '{}'));
                ctx = jQuery.extend(ctx, params.context);
                ctx = jQuery.extend(ctx, context);
                ctx = jQuery.extend(ctx, data.extra_context || {});

                var domain_context = jQuery.extend({}, ctx);
                domain_context.context = ctx;
                domain_context._user = session.user_id;
                params.domain = new Sao.PYSON.Decoder(domain_context).decode(
                        action.pyson_domain);

                var search_context = jQuery.extend({}, ctx);
                search_context.context = ctx;
                search_context._user = session.user_id;
                params.search_value = new Sao.PYSON.Decoder(search_context)
                    .decode(action.pyson_search_value || '[]');

                var tab_domain_context = jQuery.extend({}, ctx);
                tab_domain_context.context = ctx;
                tab_domain_context._user = session.user_id;
                var decoder = new Sao.PYSON.Decoder(tab_domain_context);
                params.tab_domain = [];
                action.domains.forEach(function(element, index) {
                    params.tab_domain.push(
                        [element[0], decoder.decode(element[1])]);
                });
                params.name = false;
                if (action.window_name) {
                    params.name = action.name;
                }
                params.model = action.res_model || data.res_model;
                params.res_id = action.res_id || data.res_id;
                params.context_model = action.context_model;
                params.limit = action.limit;
                params.icon = action['icon.rec_name'] || '';
                Sao.Tab.create(params);
                return;
            case 'ir.action.wizard':
                params.action = action.wiz_name;
                params.data = data;
                params.name = action.name;
                params.context = context;
                params.context = jQuery.extend(
                    params.context, data.extra_context || {});
                params.window = action.window;
                Sao.Wizard.create(params);
                return;
            case 'ir.action.report':
                params.name = action.report_name;
                params.data = data;
                params.direct_print = action.direct_print;
                params.email_print = action.email_print;
                params.email = action.email;
                params.context = context;
                Sao.Action.exec_report(params);
                return;
            case 'ir.action.url':
                window.open(action.url, '_blank');
                return;
        }
    };

    Sao.Action.exec_keyword = function(keyword, data, context, warning,
            alwaysask)
    {
        if (warning === undefined) {
            warning = true;
        }
        if (alwaysask === undefined) {
            alwaysask = false;
        }
        var actions = [];
        var model_id = data.id;
        var args = {
            'method': 'model.' + 'ir.action.keyword.get_keyword',
            'params': [keyword, [data.model, model_id], {}]
        };
        var prm = Sao.rpc(args, Sao.Session.current_session);
        var exec_action = function(actions) {
            var keyact = {};
            for (var i in actions) {
                var action = actions[i];
                keyact[action.name.replace(/_/g, '')] = action;
            }
            var prm = Sao.common.selection(
                    Sao.i18n.gettext('Select your action'),
                    keyact, alwaysask);
            return prm.then(function(action) {
                Sao.Action.exec_action(action, data, context);
            }, function() {
                if (jQuery.isEmptyObject(keyact) && warning) {
                    alert(Sao.i18n.gettext('No action defined!'));
                }
            });
        };
        return prm.pipe(exec_action);
    };

    Sao.Action.exec_report = function(attributes) {
        if (!attributes.context) {
            attributes.context = {};
        }
        if (!attributes.email) {
            attributes.email = {};
        }
        var data = jQuery.extend({}, attributes.data);
        var context = jQuery.extend({}, Sao.Session.current_session.context);
        jQuery.extend(context, attributes.context);
        context.direct_print = attributes.direct_print;
        context.email_print = attributes.email_print;
        context.email = attributes.email;

        var prm = Sao.rpc({
            'method': 'report.' + attributes.name + '.execute',
            'params': [data.ids || [], data, context]
        }, Sao.Session.current_session);
        prm.done(function(result) {
            var report_type = result[0];
            var data = result[1];
            var print = result[2];
            var name = result[3];

            // TODO direct print
            var blob = new Blob([data],
                {type: Sao.common.guess_mimetype(report_type)});
            var blob_url = window.URL.createObjectURL(blob);
            if (Sao.Action.report_blob_url) {
                window.URL.revokeObjectURL(Sao.Action.report_blob_url);
            }
            Sao.Action.report_blob_url = blob_url;
            window.open(blob_url);
        });
    };

    Sao.Action.execute = function(id, data, type, context) {
        if (!type) {
            Sao.rpc({
                'method': 'model.ir.action.read',
                'params': [[id], ['type'], context]
            }, Sao.Session.current_session).done(function(result) {
                Sao.Action.execute(id, data, result[0].type, context);
            });
        } else {
            Sao.rpc({
                'method': 'model.' + type + '.search_read',
                'params': [[['action', '=', id]], 0, 1, null, null, context]
            }, Sao.Session.current_session).done(function(result) {
                Sao.Action.exec_action(result[0], data, context);
            });
        }
    };

    Sao.Action.evaluate = function(action, atype, record) {
        action = jQuery.extend({}, action);
        var email = {};
        if ('pyson_email' in action) {
            email = record.expr_eval(action.pyson_email);
            if (jQuery.isEmptyObject(email)) {
                email = {};
            }
        }
        if (!('subject' in email)) {
            email.subject = action.name.replace(/_/g, '');
        }
        action.email = email;
        return action;
    };
}());

/* This file is part of Tryton.  The COPYRIGHT file at the top level of
   this repository contains the full copyright notices and license terms. */
(function() {
    'use strict';

    Sao.common = {};

    Sao.common.BACKSPACE_KEYCODE = 8;
    Sao.common.TAB_KEYCODE = 9;
    Sao.common.RETURN_KEYCODE = 13;
    Sao.common.ESC_KEYCODE = 27;
    Sao.common.UP_KEYCODE = 38;
    Sao.common.DOWN_KEYCODE = 40;
    Sao.common.DELETE_KEYCODE = 46;
    Sao.common.F2_KEYCODE = 113;
    Sao.common.F3_KEYCODE = 114;

    Sao.common.SELECTION_NONE = 1;
    Sao.common.SELECTION_SINGLE = 2;
    Sao.common.SELECTION_MULTIPLE = 3;

    Sao.common.BIG_IMAGE_SIZE = Math.pow(10, 6);

    Sao.common.compare = function(arr1, arr2) {
        if (arr1.length != arr2.length) {
            return false;
        }
        for (var i = 0; i < arr1.length; i++) {
            if (arr1[i] instanceof Array && arr2[i] instanceof Array) {
                if (!Sao.common.compare(arr1[i], arr2[i])) {
                    return false;
                }
            } else if (arr1[i] != arr2[i]) {
                return false;
            }
        }
        return true;
    };

    Sao.common.contains = function(array1, array2) {
        for (var i = 0; i < array1.length; i++) {
            if (Sao.common.compare(array1[i], array2)) {
                return true;
            }
        }
        return false;
    };

    // Find the intersection of two arrays.
    // The arrays must be sorted.
    Sao.common.intersect = function(a, b) {
        var ai = 0, bi = 0;
        var result = [];
        while (ai < a.length && bi < b.length) {
            if (a[ai] < b[bi]) {
                ai++;
            } else if (a[ai] > b[bi]) {
                bi++;
            } else {
                result.push(a[ai]);
                ai++;
                bi++;
            }
        }
        return result;
    };

    // Handle click and Return press event
    // If one, the handler is executed at most once for both events
    Sao.common.click_press = function(func, one) {
        return function handler(evt) {
            if (evt.type != 'keypress' ||
                    evt.which == Sao.common.RETURN_KEYCODE) {
                if (one) {
                    jQuery(this).off('click keypress', null, handler);
                }
                return func(evt);
            }
        };
    };

    // Cartesian product
    Sao.common.product = function(array, repeat) {
        repeat = repeat || 1;
        var pools = [];
        var i = 0;
        while (i < repeat) {
            pools = pools.concat(array);
            i++;
        }
        var result = [[]];
        pools.forEach(function(pool) {
            var tmp = [];
            result.forEach(function(x) {
                pool.forEach(function(y) {
                    tmp.push(x.concat([y]));
                });
            });
            result = tmp;
        });
        return result;
    };

    Sao.common.selection = function(title, values, alwaysask) {
        if (alwaysask === undefined) {
            alwaysask = false;
        }
        var prm = jQuery.Deferred();
        if (jQuery.isEmptyObject(values)) {
            prm.fail();
            return prm;
        }
        var keys = Object.keys(values).sort();
        if ((keys.length == 1) && (!alwaysask)) {
            var key = keys[0];
            prm.resolve(values[key]);
            return prm;
        }
        var dialog = new Sao.Dialog(
                title || Sao.i18n.gettext('Your selection:'),
                'selection-dialog');

        keys.forEach(function(k, i) {
            jQuery('<div/>', {
                'class': 'checkbox'
            }).append(jQuery('<label/>')
                .append(jQuery('<input/>', {
                    'type': 'radio',
                    'name': 'selection',
                    'value': i
                }))
                .append(' ' + k))
            .appendTo(dialog.body);
        });
        dialog.body.find('input').first().prop('checked', true);

        jQuery('<button/>', {
            'class': 'btn btn-link',
            'type': 'button'
        }).append(Sao.i18n.gettext('Cancel')).click(function() {
            dialog.modal.modal('hide');
            prm.fail();
        }).appendTo(dialog.footer);
        jQuery('<button/>', {
            'class': 'btn btn-primary',
            'type': 'button'
        }).append(Sao.i18n.gettext('OK')).click(function() {
            var i = dialog.body.find('input:checked').attr('value');
            dialog.modal.modal('hide');
            prm.resolve(values[keys[i]]);
        }).appendTo(dialog.footer);
        dialog.modal.on('hidden.bs.modal', function(e) {
            jQuery(this).remove();
        });
        dialog.modal.modal('show');
        return prm;
    };

    Sao.common.moment_format = function(format) {
        return format
            .replace('%a', 'ddd')
            .replace('%A', 'dddd')
            .replace('%w', 'd')
            .replace('%d', 'DD')
            .replace('%b', 'MMM')
            .replace('%B', 'MMMM')
            .replace('%m', 'MM')
            .replace('%y', 'YY')
            .replace('%Y', 'YYYY')
            .replace('%H', 'HH')
            .replace('%I', 'hh')
            .replace('%p', 'A')
            .replace('%M', 'mm')
            .replace('%S', 'ss')
            .replace('%f', 'SSS')
            .replace('%z', 'ZZ')
            .replace('%Z', 'zz')
            .replace('%j', 'DDDD')
            .replace('%U', 'ww')
            .replace('%W', 'WW')
            .replace('%c', 'llll')
            .replace('%x', 'L')
            .replace('%X', 'LTS')
            .replace('%', '%%')
            ;
    };

    Sao.common.date_format = function(format) {
        if (jQuery.isEmptyObject(format) && Sao.Session.current_session) {
            var context = Sao.Session.current_session.context;
            if (context.locale && context.locale.date) {
                format = context.locale.date;
            }
        }
        if (format) {
            return Sao.common.moment_format(format);
        }
        return '%Y-%m-%d';
    };

    Sao.common.format_time = function(format, date) {
        if (!date) {
            return '';
        }
        return date.format(Sao.common.moment_format(format));
    };

    Sao.common.parse_time = function(format, value) {
        if (jQuery.isEmptyObject(value)) {
            return null;
        }
        var getNumber = function(pattern) {
            var i = format.indexOf(pattern);
            if (~i) {
                var number = parseInt(value.slice(i, i + pattern.length), 10);
                if (!isNaN(number)) {
                    return number;
                }
            }
            return 0;
        };
        return Sao.Time(getNumber('%H'), getNumber('%M'), getNumber('%S'),
                getNumber('%f'));
    };

    Sao.common.format_date = function(date_format, date) {
        if (!date) {
            return '';
        }
        return date.format(Sao.common.moment_format(date_format));
    };

    Sao.common.parse_date = function(date_format, value) {
        var date = moment(value,
               Sao.common.moment_format(date_format));
        if (date.isValid()) {
            date = Sao.Date(date.year(), date.month(), date.date());
        } else {
            date = null;
        }
        return date;
    };

    Sao.common.format_datetime = function(date_format, time_format, date) {
        if (!date) {
            return '';
        }
        return date.format(
                Sao.common.moment_format(date_format + ' ' + time_format));
    };

    Sao.common.parse_datetime = function(date_format, time_format, value) {
        var date = moment(value,
                Sao.common.moment_format(date_format + ' ' + time_format));
        if (date.isValid()) {
            date = Sao.DateTime(date.year(), date.month(), date.date(),
                    date.hour(), date.minute(), date.second(),
                    date.millisecond());
        } else {
            date = null;
        }
        return date;
    };

    Sao.common.timedelta = {};
    Sao.common.timedelta.DEFAULT_CONVERTER = {
        's': 1
    };
    Sao.common.timedelta.DEFAULT_CONVERTER.m =
        Sao.common.timedelta.DEFAULT_CONVERTER.s * 60;
    Sao.common.timedelta.DEFAULT_CONVERTER.h =
        Sao.common.timedelta.DEFAULT_CONVERTER.m * 60;
    Sao.common.timedelta.DEFAULT_CONVERTER.d =
        Sao.common.timedelta.DEFAULT_CONVERTER.h * 24;
    Sao.common.timedelta.DEFAULT_CONVERTER.w =
        Sao.common.timedelta.DEFAULT_CONVERTER.d * 7;
    Sao.common.timedelta.DEFAULT_CONVERTER.M =
        Sao.common.timedelta.DEFAULT_CONVERTER.d * 30;
    Sao.common.timedelta.DEFAULT_CONVERTER.Y =
        Sao.common.timedelta.DEFAULT_CONVERTER.d * 365;
    Sao.common.timedelta._get_separator = function() {
        return {
            Y: Sao.i18n.gettext('Y'),
            M: Sao.i18n.gettext('M'),
            w: Sao.i18n.gettext('w'),
            d: Sao.i18n.gettext('d'),
            h: Sao.i18n.gettext('h'),
            m: Sao.i18n.gettext('m'),
            s: Sao.i18n.gettext('s')
        };
    };
    Sao.common.timedelta.format = function(value, converter) {
        if (!value) {
            return '';
        }
        if (!converter) {
            converter = Sao.common.timedelta.DEFAULT_CONVERTER;
        }
        var text = [];
        value = value.asSeconds();
        var sign = '';
        if (value < 0) {
            sign = '-';
        }
        value = Math.abs(value);
        converter = Object.keys(converter).map(function(key) {
            return [key, converter[key]];
        });
        converter.sort(function(first, second) {
            return second[1] - first[1];
        });
        var values = [];
        var k, v;
        for (var i = 0; i < converter.length; i++) {
            k = converter[i][0];
            v = converter[i][1];
            var part = Math.floor(value / v);
            value -= part * v;
            values.push(part);
        }
        for (i = 0; i < converter.length - 3; i++) {
            k = converter[i][0];
            v = values[i];
            if (v) {
                text.push(v + Sao.common.timedelta._get_separator()[k]);
            }
        }
        if (jQuery(values.slice(-3)).is(function(i, v) { return v; }) ||
                jQuery.isEmptyObject(text)) {
            var time = values.slice(-3, -1);
            time = ('00' + time[0]).slice(-2) + ':' + ('00' + time[1]).slice(-2);
            if (values.slice(-1)[0] || value) {
                time += ':' + ('00' + values.slice(-1)[0]).slice(-2);
            }
            text.push(time);
        }
        text = sign + text.reduce(function(p, c) {
            if (p) {
                return p + ' ' + c;
            } else {
                return c;
            }
        });
        if (value) {
            if (!jQuery(values.slice(-3)).is(function(i, v) { return v; })) {
                // Add space if no time
                text += ' ';
            }
            text += ('' + value.toFixed(6)).slice(1);
        }
        return text;
    };
    Sao.common.timedelta.parse = function(text, converter) {
        if (!text) {
            return null;
        }
        if (!converter) {
            converter = Sao.common.timedelta.DEFAULT_CONVERTER;
        }
        var separators = Sao.common.timedelta._get_separator();
        var separator;
        for (var k in separators) {
            separator = separators[k];
            text = text.replace(separator, separator + ' ');
        }

        var seconds = 0;
        var sec;
        var parts = text.split(' ');
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            if (part.contains(':')) {
                var subparts = part.split(':');
                var subconverter = [
                    converter.h, converter.m, converter.s];
                for (var j = 0;
                        j < Math.min(subparts.length, subconverter.length);
                        j ++) {
                    var t = subparts[j];
                    var v = subconverter[j];
                    sec = Math.abs(Number(t)) * v;
                    if (!isNaN(sec)) {
                        seconds += sec;
                    }
                }
            } else {
                var found = false;
                for (var key in separators) {
                    separator =separators[key];
                    if (part.endsWith(separator)) {
                        part = part.slice(0, -separator.length);
                        sec = Math.abs(parseInt(part, 10)) * converter[key];
                        if (!isNaN(sec)) {
                            seconds += sec;
                        }
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    sec = Math.abs(Number(part));
                    if (!isNaN(sec)) {
                        seconds += sec;
                    }
                }
            }
        }
        if (text.contains('-')) {
            seconds *= -1;
        }
        return Sao.TimeDelta(null, seconds);
    };

    Sao.common.ModelAccess = Sao.class_(Object, {
        init: function() {
            this.batchnum = 100;
            this._access = {};
        },
        load_models: function(refresh) {
            var prm = jQuery.Deferred();
            if (!refresh) {
                this._access = {};
            }
            Sao.rpc({
                'method': 'model.ir.model.list_models',
                'params': [{}]
            }, Sao.Session.current_session).then(function(models) {
                var deferreds = [];
                var update_access = function(access) {
                    this._access = jQuery.extend(this._access, access);
                };
                for (var i = 0; i < models.length; i += this.batchnum) {
                    var to_load = models.slice(i, i + this.batchnum);
                    deferreds.push(Sao.rpc({
                        'method': 'model.ir.model.access.get_access',
                        'params': [to_load, {}]
                    }, Sao.Session.current_session)
                        .then(update_access.bind(this)));
                }
                jQuery.when.apply(jQuery, deferreds).then(
                    prm.resolve, prm.reject);
            }.bind(this));
            return prm;
        },
        get: function(model) {
            return this._access[model] || {};
        }
    });
    Sao.common.MODELACCESS = new Sao.common.ModelAccess();

    Sao.common.ModelHistory = Sao.class_(Object, {
        init: function() {
            this._models = [];
        },
        load_history: function() {
            this._models = [];
            return Sao.rpc({
                'method': 'model.ir.model.list_history',
                'params': [{}]
            }, Sao.Session.current_session).then(function(models) {
                this._models = models;
            }.bind(this));
        },
        contains: function(model) {
            return ~this._models.indexOf(model);
        }
    });
    Sao.common.MODELHISTORY = new Sao.common.ModelHistory();

    Sao.common.ViewSearch = Sao.class_(Object, {
        load_searches: function() {
            this.searches = {};
            return Sao.rpc({
                'method': 'model.ir.ui.view_search.get_search',
                'params': [{}]
            }, Sao.Session.current_session).then(function(searches) {
                this.searches = searches;
            }.bind(this));
        },
        get: function(model) {
            return this.searches[model] || [];
        },
        add: function(model, name, domain) {
            return Sao.rpc({
                'method': 'model.ir.ui.view_search.create',
                'params': [[{
                    'model': model,
                    'name': name,
                    'domain': new Sao.PYSON.Encoder().encode(domain)
                }], {}]
            }, Sao.Session.current_session).then(function(ids) {
                var id = ids[0];
                if (this.searches[model] === undefined) {
                    this.searches[model] = [];
                }
                this.searches[model].push([id, name, domain]);
            }.bind(this));
        },
        remove: function(model, id) {
            return Sao.rpc({
                'method': 'model.ir.ui.view_search.delete',
                'params': [[id], {}]
            }, Sao.Session.current_session).then(function() {
                for (var i = 0; i < this.searches[model].length; i++) {
                    var domain = this.searches[model][i];
                    if (domain[0] === id) {
                        this.searches[model].splice(i, 1);
                        break;
                    }
                }
            }.bind(this));
        }
    });
    Sao.common.VIEW_SEARCH = new Sao.common.ViewSearch();

    Sao.common.humanize = function(size) {
        var sizes = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
        for (var i =0, len = sizes.length; i < len; i++) {
            if (size < 1000) {
                return size.toPrecision(4) + ' ' + sizes[i];
            }
            size /= 1000;
        }
    };

    Sao.common.EvalEnvironment = function(parent_, eval_type) {
        if (eval_type === undefined)
            eval_type = 'eval';
        var environment;
        if (eval_type == 'eval') {
            environment = parent_.get_eval();
        } else {
            environment = {};
            for (var key in parent_.model.fields) {
                var field = parent_.model.fields[key];
                environment[key] = field.get_on_change_value(parent_);
            }
        }
        environment.id = parent_.id;
        if (parent_.group.parent)
            Object.defineProperty(environment, '_parent_' +
                    parent_.group.parent_name, {
                'enumerable': true,
                'get': function() {
                    return Sao.common.EvalEnvironment(parent_.group.parent,
                        eval_type);
                }
            });
        environment.get = function(item, default_) {
            if (this.hasOwnProperty(item))
                return this[item];
            return default_;
        };

        return environment;
    };

    Sao.common.selection_mixin = {};
    Sao.common.selection_mixin.init = function() {
        this.selection = null;
        this.inactive_selection = [];
        this._last_domain = null;
        this._values2selection = {};
        this._domain_cache = {};
        if (this.nullable_widget === undefined) {
            this.nullable_widget = true;
        }
    };
    Sao.common.selection_mixin.init_selection = function(value, callback) {
        if (!value) {
            value = {};
            (this.attributes.selection_change_with || []).forEach(function(e) {
                value[e] = null;
            });
        }
        var key = JSON.stringify(value);
        var selection = this.attributes.selection || [];
        var prm;
        var prepare_selection = function(selection) {
            selection = jQuery.extend([], selection);
            if (this.attributes.sort === undefined || this.attributes.sort) {
                selection.sort(function(a, b) {
                    return a[1].localeCompare(b[1]);
                });
            }
            this.selection = jQuery.extend([], selection);
            if (callback) callback(this.selection);
        };
        if (!(selection instanceof Array) &&
                !(key in this._values2selection)) {
            if (!jQuery.isEmptyObject(this.attributes.selection_change_with)) {
                prm = this.model.execute(selection, [value]);
            } else {
                prm = this.model.execute(selection, []);
            }
            prm = prm.then(function(selection) {
                this._values2selection[key] = selection;
                return selection;
            }.bind(this));
            prm = prm.then(prepare_selection.bind(this));
        } else {
            if (key in this._values2selection) {
                selection = this._values2selection[key];
            }
            prepare_selection.call(this, selection);
            prm = jQuery.when();
        }
        this.inactive_selection = [];
        this._selection_prm = prm;
    };
    Sao.common.selection_mixin.update_selection = function(record, field,
            callback) {
        var _update_selection = function() {
            if (!field) {
                if (callback) {
                    callback(this.selection);
                }
                return;
            }
            var domain = field.get_domain(record);
            if (field.description.type == 'reference') {
                // The domain on reference field is not only based on the
                // selection so the selection can not be filtered.
                domain = [];
            }
            if (!('relation' in this.attributes)) {
                var change_with = this.attributes.selection_change_with || [];
                var value = record._get_on_change_args(change_with);
                delete value.id;
                Sao.common.selection_mixin.init_selection.call(this, value,
                        function() {
                            Sao.common.selection_mixin.filter_selection.call(
                                    this, domain, record, field);
                            if (callback) {
                                callback(this.selection);
                            }
                        }.bind(this));
            } else {
                var context = field.get_context(record);
                var jdomain = JSON.stringify([domain, context]);
                if (jdomain in this._domain_cache) {
                    this.selection = this._domain_cache[jdomain];
                    this._last_domain = [domain, context];
                }
                if ((this._last_domain !== null) &&
                        Sao.common.compare(domain, this._last_domain[0]) &&
                        (JSON.stringify(context) ==
                         JSON.stringify(this._last_domain[1]))) {
                    if (callback) {
                        callback(this.selection);
                    }
                    return;
                }
                var prm = Sao.rpc({
                    'method': 'model.' + this.attributes.relation +
                        '.search_read',
                    'params': [domain, 0, null, null, ['rec_name'], context]
                }, record.model.session);
                prm.done(function(result) {
                    var selection = [];
                    result.forEach(function(x) {
                        selection.push([x.id, x.rec_name]);
                    });
                    if (this.nullable_widget) {
                        selection.push([null, '']);
                    }
                    this._last_domain = domain;
                    this._domain_cache[jdomain] = selection;
                    this.selection = jQuery.extend([], selection);
                    if (callback) {
                        callback(this.selection);
                    }
                }.bind(this));
                prm.fail(function() {
                    this._last_domain = null;
                    this.selection = [];
                    if (callback) {
                        callback(this.selection);
                    }
                }.bind(this));
            }
        };
        this._selection_prm.done(_update_selection.bind(this));
    };
    Sao.common.selection_mixin.filter_selection = function(
            domain, record, field) {
        if (jQuery.isEmptyObject(domain)) {
            return;
        }
        var inversion = new Sao.common.DomainInversion();
        this.selection = this.selection.filter(function(value) {
            var context = {};
            context[this.field_name] = value[0];
            return inversion.eval_domain(domain, context);
        }.bind(this));
    };
    Sao.common.selection_mixin.get_inactive_selection = function(value) {
        if (!this.attributes.relation) {
            return jQuery.when([]);
        }
        for (var i = 0, len = this.inactive_selection.length; i < len; i++) {
            if (value == this.inactive_selection[i][0]) {
                return jQuery.when(this.inactive_selection[i]);
            }
        }
        var prm = Sao.rpc({
            'method': 'model.' + this.attributes.relation + '.read',
            'params': [[value], ['rec_name'], {}]
        }, Sao.Session.current_session);
        return prm.then(function(result) {
            this.inactive_selection.push([result[0].id, result[0].rec_name]);
            return [result[0].id, result[0].rec_name];
        }.bind(this));
    };

    Sao.common.Button = Sao.class_(Object, {
        init: function(attributes) {
            this.attributes = attributes;
            this.el = jQuery('<button/>', {
                'class': 'btn btn-default',
                'type': 'button'
            });
            this.icon = jQuery('<img/>', {
                'class': 'icon',
                'aria-hidden': true
            }).appendTo(this.el);
            this.icon.hide();
            this.el.append(attributes.string || '');
            this.set_icon(attributes.icon);
        },
        set_icon: function(icon_name) {
            if (!icon_name) {
                this.icon.attr('src', '');
                this.icon.hide();
                return;
            }
            var prm = Sao.common.ICONFACTORY.register_icon(icon_name);
            prm.done(function(url) {
                this.icon.attr('src', url);
                this.icon.show();
            }.bind(this));
        },
        set_state: function(record) {
            var states;
            if (record) {
                states = record.expr_eval(this.attributes.states || {});
                if (record.group.get_readonly() || record.readonly()) {
                    states.readonly = true;
                }
            } else {
                states = {};
            }
            if (states.invisible) {
                this.el.hide();
            } else {
                this.el.show();
            }
            this.el.prop('disabled', states.readonly);
            this.set_icon(states.icon || this.attributes.icon);
            if (((this.attributes.type === undefined) ||
                        (this.attributes.type === 'class')) && (record)) {
                var parent = record.group.parent;
                while (parent) {
                    if (parent.has_changed()) {
                        this.el.prop('disabled', false);
                        break;
                    }
                    parent = parent.group.parent;
                }
            }
        }
    });

    Sao.common.udlex = Sao.class_(Object, {
        init: function(instream) {

            var Stream = Sao.class_(Object, {
                init: function(stream) {
                    this.stream = stream.split('');
                    this.i = 0;
                },
                read: function(length) {
                    if (length === undefined) {
                        length = 1;
                    }
                    if (this.i >= this.stream.length) {
                        return null;
                    }
                    var value = this.stream
                        .slice(this.i, this.i + length).join();
                    this.i += length;
                    return value;
                }
            });
            this.instream = new Stream(instream);
            this.eof = null;
            this.commenters = '';
            this.nowordchars = [':', '>', '<', '=', '!', '"', ';', '(', ')'];
            this.whitespace = ' \t\r\n';
            this.whitespace_split = false;
            this.quotes = '"';
            this.escape = '\\';
            this.escapedquotes = '"';
            this.state = ' ';
            this.pushback = [];
            this.token = '';
        },
        get_token: function() {
            if (this.pushback.length > 0) {
                return this.pushback.shift();
            }
            var raw = this.read_token();
            return raw;
        },
        read_token: function() {
            var quoted = false;
            var escapedstate = ' ';
            while (true) {
                var nextchar = this.instream.read(1);
                if (this.state === null) {
                    this.token = '';  // past en of file
                    break;
                } else if (this.state == ' ') {
                    if (!nextchar) {
                        this.state = null;  // end of file
                        break;
                    } else if (this.whitespace.contains(nextchar)) {
                        if (this.token || quoted) {
                            break;  // emit current token
                        } else {
                            continue;
                        }
                    } else if (this.commenters.contains(nextchar)) {
                        // TODO readline
                    } else if (this.escape.contains(nextchar)) {
                        escapedstate = 'a';
                        this.state = nextchar;
                    } else if (!~this.nowordchars.indexOf(nextchar)) {
                        this.token = nextchar;
                        this.state = 'a';
                    } else if (this.quotes.contains(nextchar)) {
                        this.state = nextchar;
                    } else if (this.whitespace_split) {
                        this.token = nextchar;
                        this.state = 'a';
                    } else {
                        this.token = nextchar;
                        if (this.token || quoted) {
                            break;  // emit current token
                        } else {
                            continue;
                        }
                    }
                } else if (this.quotes.contains(this.state)) {
                    quoted = true;
                    if (!nextchar) {  // end of file
                        throw 'no closing quotation';
                    }
                    if (nextchar == this.state) {
                        this.state = 'a';
                    } else if (this.escape.contains(nextchar) &&
                        this.escapedquotes.contains(this.state)) {
                        escapedstate = this.state;
                        this.state = nextchar;
                    } else {
                        this.token = this.token + nextchar;
                    }
                } else if (this.escape.contains(this.state)) {
                    if (!nextchar) {  // end of file
                        throw 'no escaped character';
                    }
                    if (this.quotes.contains(escapedstate) &&
                        (nextchar != this.state) &&
                        (nextchar != escapedstate)) {
                        this.token = this.token + this.state;
                    }
                    this.token = this.token + nextchar;
                    this.state = escapedstate;
                } else if (this.state == 'a') {
                    if (!nextchar) {
                        this.state = null;  // end of file
                        break;
                    } else if (this.whitespace.contains(nextchar)) {
                        this.state = ' ';
                        if (this.token || quoted) {
                            break;  // emit current token
                        } else {
                            continue;
                        }
                    } else if (this.commenters.contains(nextchar)) {
                        // TODO
                    } else if (this.quotes.contains(nextchar)) {
                        this.state = nextchar;
                    } else if (this.escape.contains(nextchar)) {
                        escapedstate = 'a';
                        this.state = nextchar;
                    } else if ((!~this.nowordchars.indexOf(nextchar)) ||
                            this.quotes.contains(nextchar) ||
                            this.whitespace_split) {
                        this.token = this.token + nextchar;
                    } else {
                        this.pushback.unshift(nextchar);
                        this.state = ' ';
                        if (this.token) {
                            break;  // emit current token
                        } else {
                            continue;
                        }
                    }
                }
            }
            var result = this.token;
            this.token = '';
            if (!quoted && result === '') {
                result = null;
            }
            return result;
        },
        next: function() {
            var token = this.get_token();
            if (token == this.eof) {
                return null;
            }
            return token;
        }
    });

    Sao.common.DomainParser = Sao.class_(Object, {
        OPERATORS: ['!=', '<=', '>=', '=', '!', '<', '>'],
        init: function(fields, context) {
            this.fields = {};
            this.strings = {};
            for (var name in fields) {
                var field = fields[name];
                if (field.searchable || (field.searchable === undefined)) {
                    this.fields[name] = field;
                    this.strings[field.string.toLowerCase()] = field;
                }
            }
            this.context = context;
        },
        parse: function(input) {
            try {
                var lex = new Sao.common.udlex(input);
                var tokens = [];
                while (true) {
                    var token = lex.next();
                    if (token === null) {
                        break;
                    }
                    tokens.push(token);
                }
                tokens = this.group_operator(tokens);
                tokens = this.parenthesize(tokens);
                tokens = this.group(tokens);
                tokens = this.operatorize(tokens, 'or');
                tokens = this.operatorize(tokens, 'and');
                tokens = this.parse_clause(tokens);
                return this.simplify(tokens);
            } catch (e) {
                if (e == 'no closing quotation') {
                    return this.parse(input + '"');
                }
                throw e;
            }
        },
        stringable: function(domain) {
            var stringable_ = function(clause) {
                if (!clause) {
                    return true;
                }
                var is_array = function(e) {
                    return e instanceof Array;
                };
                if ((~['AND', 'OR'].indexOf(clause[0]) ||
                            (is_array(clause[0]))) &&
                        clause.slice(1).every(is_array)) {
                    return this.stringable(clause);
                }
                if ((clause[0] in this.fields) || clause[0] == 'rec_name') {
                    return true;
                }
                return false;
            }.bind(this);
            if (!domain) {
                return true;
            }
            if (~['AND', 'OR'].indexOf(domain[0])) {
                domain = domain.slice(1);
            }
            return domain.every(stringable_);
        },
        string: function(domain) {

            var string = function(clause) {
                if (jQuery.isEmptyObject(clause)) {
                    return '';
                }
                if ((typeof clause[0] != 'string') ||
                        ~['AND', 'OR'].indexOf(clause[0])) {
                    return '(' + this.string(clause) + ')';
                }
                var escaped;
                var name = clause[0];
                var operator = clause[1];
                var value = clause[2];
                if (name.endsWith('.rec_name')) {
                    name = name.slice(0, -9);
                }
                if (!(name in this.fields)) {
                    escaped = value.replace('%%', '__');
                    if (escaped.startsWith('%') && escaped.endsWith('%')) {
                        value = value.slice(1, -1);
                    }
                    return this.quote(value);
                }
                var field = this.fields[name];
                var target = null;
                if (clause.length > 3) {
                    target = clause[3];
                }
                if (operator.contains('ilike')) {
                    escaped = value.replace('%%', '__');
                    if (escaped.startsWith('%') && escaped.endsWith('%')) {
                        value = value.slice(1, -1);
                    } else if (!escaped.contains('%')) {
                        if (operator == 'ilike') {
                            operator = '=';
                        } else {
                            operator = '!';
                        }
                        value = value.replace('%%', '%');
                    }
                }
                var def_operator = this.default_operator(field);
                if (def_operator == operator.trim()) {
                    operator = '';
                    if (~this.OPERATORS.indexOf(value)) {
                        // As the value could be interpreted as an operator
                        // the default operator must be forced
                        operator = '"" ';
                    }
                } else if ((operator.contains(def_operator) &&
                            (operator.contains('not') ||
                             operator.contains('!')))) {
                    operator = operator.replace(def_operator, '')
                        .replace('not', '!').trim();
                }
                if (operator.endsWith('in')) {
                    if (operator == 'not in') {
                        operator = '!';
                    } else {
                        operator = '';
                    }
                }
                var formatted_value = this.format_value(field, value, target);
                if (~this.OPERATORS.indexOf(operator) &&
                        ~['char', 'text', 'selection']
                        .indexOf(field.type) &&
                        (value === '')) {
                    formatted_value = '""';
                }
                return (this.quote(field.string) + ': ' +
                        operator + formatted_value);
            };
            string = string.bind(this);

            if (jQuery.isEmptyObject(domain)) {
                return '';
            }
            var nary = ' ';
            if ((domain[0] == 'AND') || (domain[0] == 'OR')) {
                if (domain[0] == 'OR') {
                    nary = ' or ';
                }
                domain = domain.slice(1);
            }
            return domain.map(string).join(nary);
        },
        completion: function(input) {
            var results = [];
            var domain = this.parse(input);
            var closing = 0;
            var i, len;
            for (i=input.length; i>0; i--) {
                if (input[i] == ')' || input[i] == ' ') {
                    break;
                }
                if (input[i] == ')') {
                    closing += 1;
                }
            }
            var endings = this.ending_clause(domain);
            var ending = endings[0];
            var deep_ending = endings[1];
            var deep = deep_ending - closing;
            var string_domain = this.string(domain);

            if (deep > 0) {
                string_domain = string_domain.substring(0,
                        string_domain.length - deep);
            }
            if (string_domain != input) {
                results.push(string_domain);
            }

            var pslice = function(string, depth) {
                if (depth > 0) {
                    return string.substring(0, depth);
                }
                return string;
            };
            var complete, complete_string;
            if (ending !== null && closing === 0) {
                var completes = this.complete(ending);
                for (i=0, len=completes.length; i < len; i++) {
                    complete = completes[i];
                    complete_string = this.string(
                            this.replace_ending_clause(domain, complete));
                    results.push(pslice(complete_string, deep));
                }
            }
            if (input.length > 0) {
                if (input.substr(input.length - 1, 1) != ' ') {
                    return results;
                }
                if (input.length >= 2 ||
                        input.substr(input.length - 2, 1) == ':') {
                    return results;
                }
            }
            var field, operator, value;
            for (var key in this.strings) {
                field = this.strings[key];
                operator = this.default_operator(field);
                value = '';
                if ((operator == 'ilike') || (operator == 'not ilike')) {
                    value = this.likify(value);
                }
                var new_domain = this.append_ending_clause(domain,
                        [field.name, operator, value], deep);
                var new_domain_string = this.string(new_domain);
                results.push(pslice(new_domain_string, deep));
            }
            return results;
        },
        complete: function(clause) {
            var results = [];
            var name, operator, value, target;
            if (clause.length == 1) {
                name = clause[0];
            } else if (clause.length == 3) {
                name = clause[0];
                operator = clause[1];
                value = clause[2];
            } else {
                name = clause[0];
                operator = clause[1];
                value = clause[2];
                target = clause[3];
                if (name.endsWith('.rec_name')) {
                    name = name.substring(0, name.length - 9);
                }
            }
            var escaped;
            if (name == "rec_name") {
                if (operator == "ilike") {
                    escaped = value.replace(/%%/g, '__');
                    if (escaped.startsWith('%') || escaped.endsWith('%')) {
                        value = escaped.substring(1, escaped.length - 1);
                    } else if (~escaped.indexOf('%')) {
                        value = value.replace(/%%/g, '%');
                    }
                    operator = null;
                }
                name = value;
                value = '';
            }
            if (name === undefined || name === null) {
                name = '';
            }
            var field;
            if (!(name.toLowerCase() in this.strings) &&
                    !(name in this.fields)) {
                for (var key in this.strings) {
                    field = this.strings[key];
                    if (field.string.toLowerCase()
                            .startsWith(name.toLowerCase())) {
                        operator = this.default_operator(field);
                        value = '';
                        if (operator == 'ilike') {
                            value = this.likify(value);
                        }
                        results.push([field.name, operator, value]);
                    }
                }
                return results;
            }
            if (name in this.fields) {
                field = this.fields[name];
            } else {
                field = this.strings[name.toLowerCase()];
            }
            if (!operator) {
                operator = this.default_operator(field);
                value = '';
                if ((operator == 'ilike') || (operator == 'not ilike')) {
                    value = this.likify(value);
                }
                results.push([field.name, operator, value]);
            } else {
                var completes = this.complete_value(field, value);
                for (var i=0, len=completes.length; i < len; i++) {
                    results.push([field.name, operator, completes[i]]);
                }
            }
            return results;
        },
        is_leaf: function(element) {
            return ((element instanceof Array) && element.clause);
        },
        ending_clause: function(domain, depth) {
            if (depth === undefined) {
                depth = 0;
            }
            if (domain.length === 0) {
                return [null, depth];
            }
            var last_element = domain[domain.length - 1];
            if (!this.is_leaf(last_element)) {
                return this.ending_clause(last_element, depth + 1);
            }
            return [last_element, depth];
        },
        replace_ending_clause: function(domain, clause) {
            var results = [];
            var i, len;
            for (i = 0, len=domain.length - 1; i < len; i++) {
                results.push(domain[i]);
            }
            if (!this.is_leaf(domain[i])) {
                results = results.concat(this.replace_ending_clause(domain[i],
                            clause));
            } else {
                results.push(clause);
            }
            return results;
        },
        append_ending_clause: function(domain, clause, depth) {
            if (domain.length === 0) {
                return [clause];
            }
            var results = domain.slice(0, -1);
            var last_element = domain[domain.length - 1];
            if (!this.is_leaf(last_element)) {
                results.push(this.append_ending_clause(last_element, clause,
                            depth - 1));
            } else {
                results.push(last_element);
                if (depth === 0) {
                    results.push(clause);
                }
            }
            return results;
        },
        complete_value: function(field, value) {
            var complete_boolean = function() {
                return value ? [true] : [false];
            };

            var complete_selection = function() {
                var results = [];
                var test_value = value !== null ? value : '';
                if (value instanceof Array) {
                    test_value = value[value.length - 1];
                }
                test_value = test_value.replace(/^%*|%*$/g, '');
                var i, len, svalue, test;
                for (i=0, len=field.selection.length; i<len; i++) {
                    svalue = field.selection[i][0];
                    test = field.selection[i][1].toLowerCase();
                    if (test.startsWith(test_value.toLowerCase())) {
                        if (value instanceof Array) {
                            results.push(value.slice(0, -1).concat([svalue]));
                        } else {
                            results.push(svalue);
                        }
                    }
                }
                return results;
            };

            var complete_reference = function() {
                var results = [];
                var test_value = value !== null ? value : '';
                if (value instanceof Array) {
                    test_value = value[value.length - 1];
                }
                test_value = test_value.replace(/^%*|%*$/g, '');
                var i, len, svalue, test;
                for (i=0, len=field.selection.length; i<len; i++) {
                    svalue = field.selection[i][0];
                    test = field.selection[i][1].toLowerCase();
                    if (test.startsWith(test_value.toLowerCase())) {
                        if (value instanceof Array) {
                            results.push(value.slice(0, -1).concat([svalue]));
                        } else {
                            results.push(this.likify(svalue));
                        }
                    }
                }
                return results;
            }.bind(this);

            var complete_datetime = function() {
                return [Sao.Date(), Sao.DateTime().utc()];
            };

            var complete_date = function() {
                return [Sao.Date()];
            };

            var complete_time = function() {
                return [Sao.Time()];
            };

            var completes = {
                'boolean': complete_boolean,
                'selection': complete_selection,
                'reference': complete_reference,
                'datetime': complete_datetime,
                'date': complete_date,
                'time': complete_time
            };

            if (field.type in completes) {
                return completes[field.type]();
            }
            return [];
        },
        group_operator: function(tokens) {
            var cur = tokens[0];
            var nex = null;
            var result = [];
            tokens.slice(1).forEach(function(nex) {
                if ((nex == '=') && cur &&
                    ~this.OPERATORS.indexOf(cur + nex)) {
                    result.push(cur + nex);
                    cur = null;
                } else {
                    if (cur !== null) {
                        result.push(cur);
                    }
                    cur = nex;
                }
            }.bind(this));
            if (cur !== null) {
                result.push(cur);
            }
            return result;
        },
        parenthesize: function(tokens) {
            var result = [];
            var current = result;
            var parent = [];
            tokens.forEach(function(token, i) {
                if (current === undefined) {
                    return;
                }
                if (token == '(') {
                    parent.push(current);
                    current = current[current.push([]) - 1];
                } else if (token == ')') {
                    current = parent.pop();
                } else {
                    current.push(token);
                }
            });
            return result;
        },
        group: function(tokens) {
            var result = [];

            var _group = function(parts) {
                var result = [];
                var push_result = function(part) {
                    result.push([part]);
                };
                var i = parts.indexOf(':');
                if (!~i) {
                    parts.forEach(push_result);
                    result.forEach(function (e) {
                        e.clause = true;
                    });
                    return result;
                }
                var sub_group = function(name, lvalue) {
                    return function(part) {
                        if (!jQuery.isEmptyObject(name)) {
                            var clause;
                            if (!jQuery.isEmptyObject(lvalue)) {
                                if (part[0] !== null) {
                                    lvalue.push(part[0]);
                                }
                                clause = name.concat([lvalue]);
                                clause.clause = true;
                                result.push(clause);
                            } else {
                                clause = name.concat(part);
                                clause.clause = true;
                                result.push(clause);
                            }
                            name.splice(0, name.length);
                        } else {
                            result.push(part);
                        }
                    };
                };
                for (var j = 0; j < i; j++) {
                    var name = parts.slice(j, i).join(' ');
                    if (name.toLowerCase() in this.strings) {
                        if (!jQuery.isEmptyObject(parts.slice(0, j))) {
                            parts.slice(0, j).forEach(push_result);
                        } else {
                            push_result(null);
                        }
                        name = [name];
                        // empty string is also the default operator
                        var operators = [''].concat(this.OPERATORS);
                        if (((i + 1) < parts.length) &&
                                (~operators.indexOf(parts[i + 1]))) {
                            name = name.concat([parts[i + 1]]);
                            i += 1;
                        } else {
                            name = name.concat([null]);
                        }
                        var lvalue = [];
                        while ((i + 2) < parts.length) {
                            if (parts[i + 2] == ';') {
                                lvalue.push(parts[i + 1]);
                                i += 2;
                            } else {
                                break;
                            }
                        }
                        _group(parts.slice(i + 1)).forEach(
                                sub_group(name, lvalue));
                        if (!jQuery.isEmptyObject(name)) {
                            var clause;
                            if (!jQuery.isEmptyObject(lvalue)) {
                                clause = name.concat([lvalue]);
                                clause.clause = true;
                                result.push(clause);
                            } else {
                                clause = name.concat([null]);
                                clause.clause = true;
                                result.push(clause);
                            }
                        }
                        break;
                    }
                }
                return result;
            };
            _group = _group.bind(this);

            var parts = [];
            tokens.forEach(function(token) {
                if (this.is_generator(token)) {
                    _group(parts).forEach(function(group) {
                        if (!Sao.common.compare(group, [null])) {
                            result.push(group);
                        }
                    });
                    parts = [];
                    result.push(this.group(token));
                } else {
                    parts.push(token);
                }
            }.bind(this));
            _group(parts).forEach(function(group) {
                if (!Sao.common.compare(group, [null])) {
                    result.push(group);
                }
            });
            return result;
        },
        is_generator: function(value) {
            return (value instanceof Array) && (value.clause === undefined);
        },
        operatorize: function(tokens, operator) {
            var result = [];
            operator = operator || 'or';
            tokens = jQuery.extend([], tokens);
            var test = function(value) {
                if (value instanceof Array) {
                    return Sao.common.compare(value, [operator]);
                } else {
                    return value == operator;
                }
            };
            var cur = tokens.shift();
            while (test(cur)) {
                cur = tokens.shift();
            }
            if (cur === undefined) {
                return result;
            }
            if (this.is_generator(cur)) {
                cur = this.operatorize(cur, operator);
            }
            var nex = null;
            while (!jQuery.isEmptyObject(tokens)) {
                nex = tokens.shift();
                if ((this.is_generator(nex)) && !test(nex)) {
                    nex = this.operatorize(nex, operator);
                }
                if (test(nex)) {
                    nex = tokens.shift();
                    while (test(nex)) {
                        nex = tokens.shift();
                    }
                    if (this.is_generator(nex)) {
                        nex = this.operatorize(nex, operator);
                    }
                    if (nex !== undefined) {
                        cur = [operator.toUpperCase(), cur, nex];
                    } else {
                        if (!test(cur)) {
                            result.push([operator.toUpperCase(), cur]);
                            cur = null;
                        }
                    }
                    nex = null;
                } else {
                    if (!test(cur)) {
                        result.push(cur);
                    }
                    cur = nex;
                }
            }
            if (jQuery.isEmptyObject(tokens)) {
                if ((nex !== null) && !test(nex)) {
                    result.push(nex);
                } else if ((cur !== null) && !test(cur)) {
                    result.push(cur);
                }
            }
            return result;
        },
        _clausify: function(e) {
            e.clause = true;
            return e;
        },
        parse_clause: function(tokens) {
            var result = [];
            tokens.forEach(function(clause) {
                if (this.is_generator(clause)) {
                    result.concat(this.parse_clause(clause));
                } else if ((clause == 'OR') || (clause == 'AND')) {
                    result.push(clause);
                } else if ((clause.length == 1) &&
                    !(clause[0] instanceof Array)) {
                    result.push(this._clausify(['rec_name', 'ilike',
                                this.likify(clause[0])]));
                } else if ((clause.length == 3) &&
                    (clause[0].toLowerCase() in this.strings)) {
                    var name = clause[0];
                    var operator = clause[1];
                    var value = clause[2];
                    var field = this.strings[clause[0].toLowerCase()];

                    var target = null;
                    if (field.type == 'reference') {
                        var split = this.split_target_value(field, value);
                        target = split[0];
                        value = split[1];
                    }

                    if (!operator) {
                        operator = this.default_operator(field);
                    }
                    if (value instanceof Array) {
                        if (operator == '!') {
                            operator = 'not in';
                        } else {
                            operator = 'in';
                        }
                    }
                    if (operator == '!') {
                        operator = this.negate_operator(
                                this.default_operator(field));
                    }
                    if (~['integer', 'float', 'numeric', 'datetime', 'date',
                            'time'].indexOf(field.type)) {
                        if (value && value.contains('..')) {
                            var values = value.split('..', 2);
                            var lvalue = this.convert_value(field, values[0]);
                            var rvalue = this.convert_value(field, values[1]);
                            result.push([
                                    this._clausify([field.name, '>=', lvalue]),
                                    this._clausify([field.name, '<=', rvalue])
                                    ]);
                            return;
                        }
                    }
                    if (value instanceof Array) {
                        value = value.map(function(v) {
                            return this.convert_value(field, v);
                        }.bind(this));
                    } else {
                        value = this.convert_value(field, value);
                    }
                    if (operator.contains('like')) {
                        value = this.likify(value);
                    }
                    if (target) {
                        result.push(this._clausify([field.name + '.rec_name',
                                    operator, value, target]));
                    } else {
                        result.push(this._clausify(
                                    [field.name, operator, value]));
                    }
                }
            }.bind(this));
            return result;
        },
        likify: function(value) {
            if (!value) {
                return '%';
            }
            var escaped = value.replace('%%', '__');
            if (escaped.contains('%')) {
                return value;
            } else {
                return '%' + value + '%';
            }
        },
        quote: function(value) {
            if (typeof value != 'string') {
                return value;
            }
            if (value.contains('\\')) {
                value = value.replace(new RegExp('\\\\', 'g'), '\\\\');
            }
            if (value.contains('"')) {
                value = value.replace(new RegExp('"', 'g'), '\\"');
            }
            var tests = [':', ' ', '(', ')'].concat(this.OPERATORS);
            for (var i = 0; i < tests.length; i++) {
                var test = tests[i];
                if (value.contains(test)) {
                    return '"' + value + '"';
                }
            }
            return value;
        },
        default_operator: function(field) {
            if (~['char', 'text', 'many2one', 'many2many', 'one2many',
                    'reference'].indexOf(field.type)) {
                return 'ilike';
            } else {
                return '=';
            }
        },
        negate_operator: function(operator) {
            switch (operator) {
                case 'ilike':
                    return 'not ilike';
                case '=':
                    return '!=';
                case 'in':
                    return 'not in';
            }
        },
        time_format: function(field) {
            return new Sao.PYSON.Decoder({}).decode(field.format);
        },
        split_target_value: function(field, value) {
            var target = null;
            if (typeof value == 'string') {
                for (var i = 0; i < field.selection.length; i++) {
                    var selection = field.selection[i];
                    var key = selection[0];
                    var text = selection[1];
                    if (value.toLowerCase().startsWith(
                                text.toLowerCase() + ',')) {
                        target = key;
                        value = value.slice(text.length + 1);
                        break;
                    }
                }
            }
            return [target, value];
        },
        convert_value: function(field, value) {
            var convert_selection = function() {
                if (typeof value == 'string') {
                    for (var i = 0; i < field.selection.length; i++) {
                        var selection = field.selection[i];
                        var key = selection[0];
                        var text = selection[1];
                        if (value.toLowerCase() == text.toLowerCase()) {
                            return key;
                        }
                    }
                }
                return value;
            };

            var converts = {
                'boolean': function() {
                    if (typeof value == 'string') {
                        return [Sao.i18n.gettext('y'),
                            Sao.i18n.gettext('yes'),
                            Sao.i18n.gettext('true'),
                            Sao.i18n.gettext('t'),
                            '1'].some(
                                function(test) {
                                    return test.toLowerCase().startsWith(
                                        value.toLowerCase());
                                });
                    } else {
                        return Boolean(value);
                    }
                },
                'float': function() {
                    var result = Number(value);
                    if (isNaN(result) || value === '' || value === null) {
                        return null;
                    } else {
                        return result;
                    }
                },
                'integer': function() {
                    var result = parseInt(value, 10);
                    if (isNaN(result)) {
                        return null;
                    } else {
                        return result;
                    }
                },
                'numeric': function() {
                    var result = new Sao.Decimal(value);
                    if (isNaN(result.valueOf()) ||
                            value === '' || value === null) {
                        return null;
                    } else {
                        return result;
                    }
                },
                'selection': convert_selection,
                'reference': convert_selection,
                'datetime': function() {
                    var result = Sao.common.parse_datetime(
                            Sao.common.date_format(),
                            this.time_format(field),
                            value);
                    if (!result) {
                        result = Sao.common.parse_date(
                                Sao.common.date_format(),
                                value);
                    }
                    return result;
                }.bind(this),
                'date': function() {
                    return Sao.common.parse_date(
                            Sao.common.date_format(),
                            value);
                },
                'time': function() {
                    try {
                        return Sao.common.parse_time(this.time_format(field),
                                value);
                    } catch (e) {
                        return null;
                    }
                }.bind(this),
                'timedelta': function() {
                    var converter = null;
                    if (field.converter) {
                        converter = this.context[field.converter];
                    }
                    return Sao.common.timedelta.parse(value, converter);
                }.bind(this),
                'many2one': function() {
                    if (value === '') {
                        return null;
                    } else {
                        return value;
                    }
                }
            };
            var func = converts[field.type];
            if (func) {
                return func();
            } else {
                return value;
            }
        },
        format_value: function(field, value, target) {
            if (target === undefined) {
                target = null;
            }
            var format_float = function() {
                if (!value && value !== 0 && value !== new Sao.Decimal(0)) {
                    return '';
                }
                var digit = String(value).split('.')[1];
                if (digit) {
                    digit = digit.length;
                } else {
                    digit = 0;
                }
                return value.toFixed(digit);
            };
            var format_selection = function() {
                for (var i = 0; i < field.selection.length; i++) {
                    if (field.selection[i][0] == value) {
                        return field.selection[i][1];
                    }
                }
                return value || '';
            };

            var format_reference = function() {
                if (!target) {
                    return format_selection();
                }
                for (var i = 0; i < field.selection.length; i++) {
                    if (field.selection[i][0] == target) {
                        target = field.selection[i][1];
                        break;
                    }
                }
                return target + ',' + value;
            };

            var converts = {
                'boolean': function() {
                    if (value) {
                        return Sao.i18n.gettext('True');
                    } else {
                        return Sao.i18n.gettext('False');
                    }
                },
                'integer': function() {
                    if (value || value === 0) {
                        return '' + parseInt(value, 10);
                    } else {
                        return '';
                    }
                },
                'float': format_float,
                'numeric': format_float,
                'selection': format_selection,
                'reference': format_reference,
                'datetime': function() {
                    if (!value) {
                        return '';
                    }
                    if (value.isDate ||
                            !(value.hour() ||
                                value.minute() ||
                                value.second())) {
                        return Sao.common.format_date(
                                Sao.common.date_format(),
                                value);
                    }
                    return Sao.common.format_datetime(
                            Sao.common.date_format(),
                            this.time_format(field),
                            value);
                }.bind(this),
                'date': function() {
                    return Sao.common.format_date(
                            Sao.common.date_format(),
                            value);
                },
                'time': function() {
                    if (!value) {
                        return '';
                    }
                    return Sao.common.format_time(
                            this.time_format(field),
                            value);
                }.bind(this),
                'timedelta': function() {
                    if (!value || !value.valueOf()) {
                        return '';
                    }
                    var converter = null;
                    if (field.converter) {
                        converter = this.context[field.converter];
                    }
                    return Sao.common.timedelta.format(value, converter);
                }.bind(this),
                'many2one': function() {
                    if (value === null) {
                        return '';
                    } else {
                        return value;
                    }
                }
            };
            if (value instanceof Array) {
                return value.map(function(v) {
                    return this.format_value(field, v);
                }.bind(this)).join(';');
            } else {
                var func = converts[field.type];
                if (func) {
                    return this.quote(func(value));
                } else if (value === null) {
                    return '';
                } else {
                    return this.quote(value);
                }
            }
        },
        simplify: function(value) {
            if ((value instanceof Array) && !this.is_leaf(value)) {
                if ((value.length == 1) && (value[0] instanceof Array) &&
                        ((value[0][0] == 'AND') || (value[0][0] == 'OR') ||
                         (value[0][0] instanceof Array))) {
                    return this.simplify(value[0]);
                } else if ((value.length == 2) &&
                        ((value[0] == 'AND') || (value[0] == 'OR')) &&
                        (value[1] instanceof Array)) {
                    return this.simplify(value[1]);
                } else if ((value.length == 3) &&
                        ((value[0] == 'AND') || (value[0] == 'OR')) &&
                        (value[1] instanceof Array) &&
                        (value[0] == value[1][0])) {
                    value = this.simplify(value[1]).concat([value[2]]);
                }
                return value.map(this.simplify.bind(this));
            }
            return value;
        }
    });

    Sao.common.DomainInversion = Sao.class_(Object, {
        and: function(a, b) {return a && b;},
        or: function(a, b) {return a || b;},
        OPERATORS: {
            '=': function(a, b) {
                if ((a instanceof Array) && (b instanceof Array)) {
                    return Sao.common.compare(a, b);
                } else {
                    return (a === b);
                }
            },
            '>': function(a, b) {return (a > b);},
            '<': function(a, b) {return (a < b);},
            '<=': function(a, b) {return (a <= b);},
            '>=': function(a, b) {return (a >= b);},
            '!=': function(a, b) {
                if ((a instanceof Array) && (b instanceof Array)) {
                    return !Sao.common.compare(a, b);
                } else {
                    return (a !== b);
                }
            },
            'in': function(a, b) {
                return Sao.common.DomainInversion.in_(a, b);
            },
            'not in': function(a, b) {
                return !Sao.common.DomainInversion.in_(a, b);
            },
            // Those operators are not supported (yet ?)
            'like': function() {return true;},
            'ilike': function() {return true;},
            'not like': function() {return true;},
            'not ilike': function() {return true;},
            'child_of': function() {return true;},
            'not child_of': function() {return true;}
        },
        locale_part: function(expression, field_name, locale_name) {
            if (locale_name === undefined) {
                locale_name = 'id';
            }
            if (expression === field_name) {
                return locale_name;
            }
            if (expression.contains('.')) {
                return expression.split('.').slice(1).join('.');
            }
            return expression;
        },
        is_leaf: function(expression) {
            return ((expression instanceof Array) &&
                (expression.length > 2) &&
                (typeof expression[1] == 'string'));
        },
        eval_leaf: function(part, context, boolop) {
            if (boolop === undefined) {
                boolop = this.and;
            }
            var field = part[0];
            var operand = part[1];
            var value = part[2];
            if (field.contains('.')) {
                // In the case where the leaf concerns a m2o then having a
                // value in the evaluation context is deemed suffisant
                return Boolean(context[field.split('.')[0]]);
            }
            if ((operand == '=') &&
                    (context[field] === null || context[field] === undefined) &&
                    (boolop === this.and)) {
                // We should consider that other domain inversion will set a
                // correct value to this field
                return true;
            }
            var context_field = context[field];
            if ((context_field && context_field._isAMomentObject) && !value) {
                if (context_field.isDateTime) {
                    value = Sao.DateTime.min;
                } else {
                    value = Sao.Date.min;
                }
            }
            if ((value && value._isAMomentObject) && !context_field) {
                if (value.isDateTime) {
                    context_field = Sao.DateTime.min;
                } else {
                    context_field = Sao.Date.min;
                }
            }
            if ((typeof context_field == 'string') &&
                    (value instanceof Array) && value.length == 2) {
                value = value.join(',');
            } else if ((context_field instanceof Array) &&
                    (typeof value == 'string') && context_field.length == 2) {
                context_field = context_field.join(',');
            }
            if (~['=', '!='].indexOf(operand) &&
                    context_field instanceof Array &&
                    typeof value == 'number') {
                operand = {
                    '=': 'in',
                    '!=': 'not in'
                }[operand];
            }
            if (operand in this.OPERATORS) {
                return this.OPERATORS[operand](context_field, value);
            } else {
                return true;
            }
        },
        inverse_leaf: function(domain) {
            if (~['AND', 'OR'].indexOf(domain)) {
                return domain;
            } else if (this.is_leaf(domain)) {
                if (domain[1].contains('child_of')) {
                    if (domain.length == 3) {
                        return domain;
                    } else {
                        return [domain[3]].concat(domain.slice(1));
                    }
                }
                return domain;
            } else {
                return domain.map(this.inverse_leaf.bind(this));
            }
        },
        filter_leaf: function(domain, field, model) {
            if (~['AND', 'OR'].indexOf(domain)) {
                return domain;
            } else if (this.is_leaf(domain)) {
                if (domain[0].startsWith(field) && (domain.length > 3)) {
                    if (domain[3] !== model) {
                        return ['id', '=', null];
                    }
                }
                return domain;
            } else {
                return domain.map(function(d) {
                    return this.filter_leaf(d, field, model);
                }.bind(this));
            }
        },
        eval_domain: function(domain, context, boolop) {
            if (boolop === undefined) {
                boolop = this.and;
            }
            if (this.is_leaf(domain)) {
                return this.eval_leaf(domain, context, boolop);
            } else if (jQuery.isEmptyObject(domain) && boolop == this.and) {
                return true;
            } else if (jQuery.isEmptyObject(domain) && boolop == this.or) {
                return false;
            } else if (domain[0] == 'AND') {
                return this.eval_domain(domain.slice(1), context);
            } else if (domain[0] == 'OR') {
                return this.eval_domain(domain.slice(1), context, this.or);
            } else {
                return boolop(this.eval_domain(domain[0], context),
                        this.eval_domain(domain.slice(1), context, boolop));
            }
        },
        localize_domain: function(domain, field_name, strip_target) {
            if (~['AND', 'OR', true, false].indexOf(domain)) {
                return domain;
            } else if (this.is_leaf(domain)) {
                if (domain[1].contains('child_of')) {
                    if (domain.length == 3) {
                        return domain;
                    } else {
                        return [domain[3]].concat(domain.slice(1, -1));
                    }
                }
                var local_name = 'id';
                if (typeof domain[2] == 'string') {
                    local_name = 'rec_name';
                }
                var n = strip_target ? 3 : 4;
                return [this.locale_part(domain[0], field_name, local_name)]
                    .concat(domain.slice(1, n)).concat(domain.slice(4));
            } else {
                return domain.map(function(e) {
                    return this.localize_domain(e, field_name, strip_target);
                }.bind(this));
            }
        },
        simplify: function(domain) {
            if (this.is_leaf(domain)) {
                return domain;
            } else if (~['OR', 'AND'].indexOf(domain)) {
                return domain;
            } else if ((domain instanceof Array) && (domain.length == 1) &&
                    (~['OR', 'AND'].indexOf(domain[0]))) {
                return [];
            } else if ((domain instanceof Array) && (domain.length == 1) &&
                    (!this.is_leaf(domain[0]))) {
                return this.simplify(domain[0]);
            } else if ((domain instanceof Array) && (domain.length == 2) &&
                    ~['AND', 'OR'].indexOf(domain[0])) {
                return [this.simplify(domain[1])];
            } else {
                return domain.map(this.simplify.bind(this));
            }
        },
        merge: function(domain, domoperator) {
            if (jQuery.isEmptyObject(domain) ||
                    ~['AND', 'OR'].indexOf(domain)) {
                return [];
            }
            var domain_type = domain[0] == 'OR' ? 'OR' : 'AND';
            if (this.is_leaf(domain)) {
                return [domain];
            } else if (domoperator === undefined) {
                return [domain_type].concat([].concat.apply([],
                        domain.map(function(e) {
                            return this.merge(e, domain_type);
                        }.bind(this))));
            } else if (domain_type == domoperator) {
                return [].concat.apply([], domain.map(function(e) {
                    return this.merge(e, domain_type);
                }.bind(this)));
            } else {
                // without setting the domoperator
                return [this.merge(domain)];
            }
        },
        concat: function(domains, domoperator) {
            var result = [];
            if (domoperator) {
                result.push(domoperator);
            }
            domains.forEach(function append(domain) {
                if (!jQuery.isEmptyObject(domain)) {
                    result.push(domain);
                }
            });
            return this.simplify(this.merge(result));
        },
        unique_value: function(domain) {
            if ((domain instanceof Array) &&
                    (domain.length == 1) &&
                    !domain[0][0].contains('.') &&
                    (domain[0][1] == '=')) {
                return [true, domain[0][1], domain[0][2]];
            } else {
                return [false, null, null];
            }
        },
        parse: function(domain) {
            var And = Sao.common.DomainInversion.And;
            var Or = Sao.common.DomainInversion.Or;
            if (this.is_leaf(domain)) {
                return domain;
            } else if (jQuery.isEmptyObject(domain)) {
                return new And([]);
            } else if (domain[0] === 'OR') {
                return new Or(domain.slice(1));
            } else {
                var begin = 0;
                if (domain[0] === 'AND') {
                    begin = 1;
                }
                return new And(domain.slice(begin));
            }
        },
        domain_inversion: function(domain, symbol, context) {
            if (context === undefined) {
                context = {};
            }
            var expression = this.parse(domain);
            if (!~expression.variables.indexOf(symbol)) {
                return true;
            }
            return expression.inverse(symbol, context);
        }
    });
    Sao.common.DomainInversion.in_ = function(a, b) {
        if (a instanceof Array) {
            if (b instanceof Array) {
                for (var i = 0, len = a.length; i < len; i++) {
                    if (~b.indexOf(a[i])) {
                        return true;
                    }
                }
                return false;
            } else {
                return Boolean(~a.indexOf(b));
            }
        } else {
            return Boolean(~b.indexOf(a));
        }
    };
    Sao.common.DomainInversion.And = Sao.class_(Object, {
        init: function(expressions) {
            this.domain_inversion = new Sao.common.DomainInversion();
            this.branches = expressions.map(this.domain_inversion.parse.bind(
                    this.domain_inversion));
            this.variables = [];
            for (var i = 0, len = this.branches.length; i < len; i++) {
                var expression = this.branches[i];
                if (this.domain_inversion.is_leaf(expression)) {
                    this.variables.push(this.base(expression[0]));
                } else if (expression instanceof
                    Sao.common.DomainInversion.And) {
                    this.variables = this.variables.concat(
                        expression.variables);
                }
            }
        },
        base: function(expression) {
            if (!expression.contains('.')) {
                return expression;
            } else {
                return expression.split('.')[0];
            }
        },
        inverse: function(symbol, context) {
            var DomainInversion = Sao.common.DomainInversion;
            var result = [];
            for (var i = 0, len = this.branches.length; i < len; i++) {
                var part = this.branches[i];
                if (part instanceof DomainInversion.And) {
                    var part_inversion = part.inverse(symbol, context);
                    var evaluated = typeof part_inversion == 'boolean';
                    if (!evaluated) {
                        result.push(part_inversion);
                    } else if (part_inversion) {
                        continue;
                    } else {
                        return false;
                    }
                } else if (this.domain_inversion.is_leaf(part) &&
                        (this.base(part[0]) === symbol)) {
                    result.push(part);
                } else {
                    var field = part[0];
                    if ((!(field in context)) ||
                            ((field in context) &&
                             this.domain_inversion.eval_leaf(part, context,
                                 this.domain_inversion.and))) {
                        result.push(true);
                    } else {
                        return false;
                    }
                }
            }
            result = result.filter(function(e) {
                return e !== true;
            });
            if (jQuery.isEmptyObject(result)) {
                return true;
            } else {
                return this.domain_inversion.simplify(result);
            }
        }
    });
    Sao.common.DomainInversion.Or = Sao.class_(Sao.common.DomainInversion.And, {
        inverse: function(symbol, context) {
            var DomainInversion = Sao.common.DomainInversion;
            var result = [];
            if (!~this.variables.indexOf(symbol) &&
                !jQuery.isEmptyObject(this.variables.filter(function(e) {
                    return !(e in context);
                }))) {
                // In this case we don't know anything about this OR part, we
                // consider it to be True (because people will have the
                // constraint on this part later).
                return true;
            }
            for (var i = 0, len = this.branches.length; i < len; i++) {
                var part = this.branches[i];
                if (part instanceof DomainInversion.And) {
                    var part_inversion = part.inverse(symbol, context);
                    var evaluated = typeof part_inversion == 'boolean';
                    if (!~this.variables.indexOf(symbol)) {
                        if (evaluated && part_inversion) {
                            return true;
                        }
                        continue;
                    }
                    if (!evaluated) {
                        result.push(part_inversion);
                    } else if (part_inversion) {
                        return true;
                    } else {
                        continue;
                    }
                } else if (this.domain_inversion.is_leaf(part) &&
                        (this.base(part[0]) == symbol)) {
                    result.push(part);
                } else {
                    var field = part[0];
                    field = this.base(field);
                    if ((field in context) &&
                            this.domain_inversion.eval_leaf(part, context,
                                this.domain_inversion.or)) {
                        return true;
                    } else if ((field in context) &&
                            !this.domain_inversion.eval_leaf(part, context,
                                this.domain_inversion.or)) {
                        result.push(false);
                    }
                }
            }
            result = result.filter(function(e) {
                return e !== false;
            });
            if (jQuery.isEmptyObject(result)) {
                return false;
            } else {
                return this.domain_inversion.simplify(['OR'].concat(result));
            }
        }
    });

    Sao.common.guess_mimetype = function(filename) {
        if (/.*odt$/.test(filename)) {
            return 'application/vnd.oasis.opendocument.text';
        } else if (/.*ods$/.test(filename)) {
            return 'application/vnd.oasis.opendocument.spreadsheet';
        } else if (/.*pdf$/.test(filename)) {
            return 'application/pdf';
        } else if (/.*docx$/.test(filename)) {
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (/.*doc/.test(filename)) {
            return 'application/msword';
        } else if (/.*xlsx$/.test(filename)) {
            return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else if (/.*xls/.test(filename)) {
            return 'application/vnd.ms-excel';
        } else {
            return 'application/octet-binary';
        }
    };

    Sao.common.LOCAL_ICONS = [
        'tryton-attachment-hi',
        'tryton-attachment',
        'tryton-bookmark',
        'tryton-cancel',
        'tryton-clear',
        'tryton-close',
        'tryton-connect',
        'tryton-copy',
        'tryton-delete',
        'tryton-dialog-error',
        'tryton-dialog-information',
        'tryton-dialog-warning',
        'tryton-disconnect',
        'tryton-executable',
        'tryton-find-replace',
        'tryton-find',
        'tryton-folder-new',
        'tryton-fullscreen',
        'tryton-go-home',
        'tryton-go-jump',
        'tryton-go-next',
        'tryton-go-previous',
        'tryton-help',
        'tryton-icon',
        'tryton-list-add',
        'tryton-list-remove',
        'tryton-locale',
        'tryton-lock',
        'tryton-log-out',
        'tryton-mail-message-new',
        'tryton-mail-message',
        'tryton-new',
        'tryton-ok',
        'tryton-open',
        'tryton-preferences-system-session',
        'tryton-preferences-system',
        'tryton-preferences',
        'tryton-print-email',
        'tryton-print-open',
        'tryton-print',
        'tryton-refresh',
        'tryton-save-as',
        'tryton-save',
        'tryton-star',
        'tryton-start-here',
        'tryton-system-file-manager',
        'tryton-system',
        'tryton-text-background',
        'tryton-text-foreground',
        'tryton-text-markup',
        'tryton-undo',
        'tryton-unstar',
        'tryton-web-browser'
    ];

    Sao.common.IconFactory = Sao.class_(Object, {
        batchnum: 10,
        name2id: {},
        loaded_icons: {},
        tryton_icons: [],
        register_prm: jQuery.when(),
        load_icons: function(refresh) {
            refresh = refresh || false;
            if (!refresh) {
                for (var icon_name in this.load_icons) {
                    if (!this.load_icons.hasOwnProperty(icon_name)) {
                        continue;
                    }
                    window.URL.revokeObjectURL(this.load_icons[icon_name]);
                }
            }

            var icon_model = new Sao.Model('ir.ui.icon');
            return icon_model.execute('list_icons', [], {})
            .then(function(icons) {
                if (!refresh) {
                    this.name2id = {};
                    this.loaded_icons = {};
                }
                this.tryton_icons = [];

                var icon_id, icon_name;
                for (var i=0, len=icons.length; i < len; i++) {
                    icon_id = icons[i][0];
                    icon_name = icons[i][1];
                    if (refresh && (icon_name in this.loaded_icons)) {
                        continue;
                    }
                    this.tryton_icons.push([icon_id, icon_name]);
                    this.name2id[icon_name] = icon_id;
                }
            }.bind(this));
        },
        register_icon: function(icon_name) {
            if (!icon_name) {
                return jQuery.Deferred().reject();
            } else if ((icon_name in this.loaded_icons) ||
                    ~Sao.common.LOCAL_ICONS.indexOf(icon_name)) {
                return jQuery.when(this.get_icon_url(icon_name));
            }
            if (this.register_prm.state() == 'pending') {
                var waiting_prm = jQuery.Deferred();
                this.register_prm.then(function() {
                    this.register_icon(icon_name).then(
                        waiting_prm.resolve, waiting_prm.reject);
                }.bind(this));
                return waiting_prm;
            }
            var loaded_prm;
            if (!(icon_name in this.name2id)) {
                loaded_prm = this.load_icons(true);
            } else {
                loaded_prm = jQuery.when();
            }

            var icon_model = new Sao.Model('ir.ui.icon');
            this.register_prm = loaded_prm.then(function () {
                var find_array = function(array) {
                    var idx, l;
                    for (idx=0, l=this.tryton_icons.length; idx < l; idx++) {
                        var icon = this.tryton_icons[idx];
                        if (Sao.common.compare(icon, array)) {
                            break;
                        }
                    }
                    return idx;
                }.bind(this);
                var idx = find_array([this.name2id[icon_name], icon_name]);
                var from = Math.round(idx - this.batchnum / 2);
                from = (from < 0) ? 0 : from;
                var to = Math.round(idx + this.batchnum / 2);
                var ids = [];
                this.tryton_icons.slice(from, to).forEach(function(e) {
                    ids.push(e[0]);
                });

                var read_prm = icon_model.execute('read',
                    [ids, ['name', 'icon']], {});
                return read_prm.then(function(icons) {
                    icons.forEach(function(icon) {
                        var img_url;
                        if (navigator.userAgent.match(/firefox/i)) {
                            // Fixefox doesn't support SVG inside Blob
                            // https://bugzilla.mozilla.org/show_bug.cgi?id=841920
                            // Temporary use the embeded base64 version which
                            // will be replaced later by the URL of the png object
                            img_url = 'data:image/svg+xml;base64,' +
                                window.btoa(unescape(encodeURIComponent(icon.icon)));
                            var image = new Image();
                            image.src = img_url;
                            image.onload = function() {
                                var canvas = document.createElement('canvas');
                                canvas.width = image.width;
                                canvas.height = image.height;
                                var context = canvas.getContext('2d');
                                context.drawImage(image, 0, 0);
                                canvas.toBlob(function(blob) {
                                    var old_img_url = img_url;
                                    img_url =  window.URL.createObjectURL(blob);
                                    this.loaded_icons[icon.name] = img_url;
                                    jQuery(document).find('img').each(function(i, el) {
                                        if (el.src == old_img_url) {
                                            el.src = img_url;
                                        }
                                    });
                                    canvas.remove();
                                }.bind(this), 'image/png');
                            }.bind(this);
                        } else {
                            var blob = new Blob([icon.icon],
                                {type: 'image/svg+xml'});
                            img_url = window.URL.createObjectURL(blob);
                        }
                        this.loaded_icons[icon.name] = img_url;
                        delete this.name2id[icon.name];
                        this.tryton_icons.splice(
                            find_array([icon.id, icon.name]), 1);
                    }.bind(this));
                    return this.get_icon_url(icon_name);
                }.bind(this));
            }.bind(this));
            return this.register_prm;
        },
        get_icon_url: function(icon_name) {
            if (icon_name in this.loaded_icons) {
                return this.loaded_icons[icon_name];
            }
            return "images/" + icon_name + ".svg";
        }
    });

    Sao.common.ICONFACTORY = new Sao.common.IconFactory();

    Sao.common.UniqueDialog = Sao.class_(Object, {
        init: function() {
            this.running = false;
        },
        build_dialog: function() {
            var dialog = new Sao.Dialog('', this.class_);
            return dialog;
        },
        run: function() {
            if (this.running) {
                // [Bug Sao]
                return this.running;
            }
            var args = Array.prototype.slice.call(arguments);
            var prm = jQuery.Deferred();
            args.push(prm);
            var dialog = this.build_dialog.apply(this, args);
            dialog.content.submit(function(evt) {
                dialog.footer.find('button.btn-primary').first().click();
                evt.preventDefault();
            }.bind(this));
            this.running = prm;
            dialog.modal.modal('show');
            dialog.modal.on('shown.bs.modal', function() {
                dialog.modal.find('input,select')
                    .filter(':visible').first().focus();
            });
            return prm;
        },
        close: function(dialog) {
            dialog.modal.on('hidden.bs.modal', function(event) {
                jQuery(this).remove();
            });
            dialog.modal.modal('hide');
            this.running = false;
        }
    });

    Sao.common.MessageDialog = Sao.class_(Sao.common.UniqueDialog, {
        class_: 'message-dialog',
        build_dialog: function(message, icon, prm) {
            var dialog = Sao.common.MessageDialog._super.build_dialog.call(
                this);
            dialog.header.remove();
            dialog.body.append(jQuery('<div/>', {
                'class': 'alert alert-info',
                role: 'alert'
            }).append(jQuery('<span/>', {
                'class': 'glyphicon ' + icon,
                'aria-hidden': true
            })).append(jQuery('<span/>', {
                'class': 'sr-only'
            }).append(Sao.i18n.gettext('Message: '))
            ).append(jQuery('<span/>')
                .append(message)
                .css('white-space', 'pre-wrap')));
            jQuery('<button/>', {
                'class': 'btn btn-primary',
                'type': 'button'
            }).append(Sao.i18n.gettext('OK')).click(function() {
                this.close(dialog);
                prm.resolve('ok');
            }.bind(this)).appendTo(dialog.footer);
            return dialog;
        },
        run: function(message, icon) {
            return Sao.common.MessageDialog._super.run.call(
                    this, message, icon || 'glyphicon-info-sign');
        }
    });
    Sao.common.message = new Sao.common.MessageDialog();

    Sao.common.WarningDialog = Sao.class_(Sao.common.UniqueDialog, {
        class_: 'warning-dialog',
        build_dialog: function(message, title, prm) {
            var dialog = Sao.common.WarningDialog._super.build_dialog.call(
                this);
            dialog.add_title(title);
            dialog.body.append(jQuery('<div/>', {
                'class': 'alert alert-warning',
                role: 'alert'
            }).append(jQuery('<span/>', {
                'class': 'glyphicon glyphicon-alert',
                'aria-hidden': true
            })).append(jQuery('<span/>', {
                'class': 'sr-only'
            }).append(Sao.i18n.gettext('Warning: '))
            ).append(jQuery('<span/>')
                .append(message)
                .css('white-space', 'pre-wrap')));
            jQuery('<button/>', {
                'class': 'btn btn-primary',
                'type': 'button'
            }).append(Sao.i18n.gettext('OK')).click(function() {
                this.close(dialog);
                prm.resolve('ok');
            }.bind(this)).appendTo(dialog.footer);
            return dialog;
        }
    });
    Sao.common.warning = new Sao.common.WarningDialog();

    Sao.common.UserWarningDialog = Sao.class_(Sao.common.WarningDialog, {
        class_: 'user-warning-dialog',
        always: false,
        _set_always: function() {
            this.always = jQuery(this).prop('checked');
        },
        build_dialog: function(message, title, prm) {
            var dialog = Sao.common.UserWarningDialog._super.build_dialog.call(
                this, message, title, prm);
            dialog.body.append(jQuery('<div/>')
                .append(jQuery('<input/>', {
                    'type': 'checkbox'
                }).change(this._set_always.bind(this)))
                .append(jQuery('<span/>')
                    .text(Sao.i18n.gettext('Always ignore this warning.')))
                );
            dialog.body.append(jQuery('<p/>')
                    .text(Sao.i18n.gettext('Do you want to proceed?')));
            dialog.footer.children().remove();
            jQuery('<button/>', {
                'class': 'btn btn-link',
                'type': 'button'
            }).append(Sao.i18n.gettext('No')).click(function() {
                this.close(dialog);
                prm.reject();
            }.bind(this)).appendTo(dialog.footer);
            jQuery('<button/>', {
                'class': 'btn btn-primary',
                'type': 'button'
            }).append(Sao.i18n.gettext('Yes')).click(function() {
                this.close(dialog);
                if (this.always) {
                    prm.resolve('always');
                }
                prm.resolve('ok');
            }.bind(this)).appendTo(dialog.footer);
            return dialog;
        }
    });
    Sao.common.userwarning = new Sao.common.UserWarningDialog();

    Sao.common.ConfirmationDialog = Sao.class_(Sao.common.UniqueDialog, {
        class_: 'confirmation-dialog',
        build_dialog: function(message) {
            var dialog = Sao.common.ConfirmationDialog._super.build_dialog.call(
                this);
            dialog.header.remove();
            dialog.body.append(jQuery('<div/>', {
                'class': 'alert alert-info',
                role: 'alert'
            }).append(jQuery('<span/>', {
                'class': 'glyphicon glyphicon-info-sign',
                'aria-hidden': true
            })).append(jQuery('<span/>', {
                'class': 'sr-only'
            }).append(Sao.i18n.gettext('Confirmation: '))
            ).append(jQuery('<span/>')
                .append(message)
                .css('white-space', 'pre-wrap')));
            return dialog;
        }
    });

    Sao.common.SurDialog = Sao.class_(Sao.common.ConfirmationDialog, {
        build_dialog: function(message, prm) {
            var dialog = Sao.common.SurDialog._super.build_dialog.call(
                this, message);
            jQuery('<button/>', {
                'class': 'btn btn-link',
                'type': 'button'
            }).append(Sao.i18n.gettext('Cancel')).click(function() {
                this.close(dialog);
                prm.reject();
            }.bind(this)).appendTo(dialog.footer);
            jQuery('<button/>', {
                'class': 'btn btn-primary',
                'type': 'button'
            }).append(Sao.i18n.gettext('OK')).click(function() {
                this.close(dialog);
                prm.resolve();
            }.bind(this)).appendTo(dialog.footer);
            return dialog;
        }
    });
    Sao.common.sur = new Sao.common.SurDialog();

    Sao.common.Sur3BDialog = Sao.class_(Sao.common.ConfirmationDialog, {
        build_dialog: function(message, prm) {
            var dialog = Sao.common.SurDialog._super.build_dialog.call(
                this, message);
            jQuery('<button/>', {
                'class': 'btn btn-link',
                'type': 'button'
            }).append(Sao.i18n.gettext('Cancel')).click(function() {
                this.close(dialog);
                prm.resolve('cancel');
            }.bind(this)).appendTo(dialog.footer);
            jQuery('<button/>', {
                'class': 'btn btn-default',
                'type': 'button'
            }).append(Sao.i18n.gettext('No')).click(function() {
                this.close(dialog);
                prm.resolve('ko');
            }.bind(this)).appendTo(dialog.footer);
            jQuery('<button/>', {
                'class': 'btn btn-primary',
                'type': 'button'
            }).append(Sao.i18n.gettext('Yes')).click(function() {
                this.close(dialog);
                prm.resolve('ok');
            }.bind(this)).appendTo(dialog.footer);
            return dialog;
        }
    });
    Sao.common.sur_3b = new Sao.common.Sur3BDialog();

    Sao.common.AskDialog = Sao.class_(Sao.common.UniqueDialog, {
        class_: 'ask-dialog',
        run: function() {
            var args = Array.prototype.slice.call(arguments);
            if (args.length == 1) {
                args.push(true);
            }
            return Sao.common.AskDialog._super.run.apply(this, args);
        },
        build_dialog: function(question, visibility, prm) {
            var dialog = Sao.common.AskDialog._super.build_dialog.call(this);
            dialog.header.remove();
            var entry = jQuery('<input/>', {
                'class': 'form-control',
                'type': visibility ? 'input' : 'password',
                'id': 'ask-dialog-entry'
            });
            dialog.body.append(jQuery('<div/>', {
                'class': 'form-group'
            }).append(jQuery('<label/>', {
                'for': 'ask-dialog-entry'
            }).append(question)).append(entry));
            jQuery('<button/>', {
                'class': 'btn btn-link',
                'type': 'button'
            }).append(Sao.i18n.gettext('Cancel')).click(function() {
                this.close(dialog);
                prm.reject();
            }.bind(this)).appendTo(dialog.footer);
            jQuery('<button/>', {
                'class': 'btn btn-primary',
                'type': 'button'
            }).append(Sao.i18n.gettext('OK')).click(function() {
                this.close(dialog);
                prm.resolve(entry.val());
            }.bind(this)).appendTo(dialog.footer);
            return dialog;
        }
    });
    Sao.common.ask = new Sao.common.AskDialog();

    Sao.common.ConcurrencyDialog = Sao.class_(Sao.common.UniqueDialog, {
        class_: 'ask-dialog',
        build_dialog: function(model, record_id, context, prm) {
            var dialog = Sao.common.ConcurrencyDialog._super.build_dialog.call(
                this);
            dialog.modal.find('.modal-dialog'
                ).removeClass('modal-sm').addClass('modal-lg');
            dialog.add_title(Sao.i18n.gettext('Concurrency Exception'));
            dialog.body.append(jQuery('<div/>', {
                'class': 'alert alert-warning',
                role: 'alert'
            }).append(jQuery('<p/>')
                .append(jQuery('<span/>', {
                    'class': 'glyphicon glyphicon-info-sign',
                    'aria-hidden': true
                })).append(jQuery('<span/>', {
                    'class': 'sr-only'
                }).append(Sao.i18n.gettext('Write Concurrency Warning: '))
                ).append(Sao.i18n.gettext('This record has been modified ' +
                'while you were editing it.')))
                .append(jQuery('<p/>').text(Sao.i18n.gettext('Choose:')))
                .append(jQuery('<ul/>')
                    .append(jQuery('<li/>')
                        .text(Sao.i18n.gettext('"Cancel" to cancel saving;')))
                    .append(jQuery('<li/>')
                        .text(Sao.i18n.gettext(
                                '"Compare" to see the modified version;')))
                    .append(jQuery('<li/>')
                        .text(Sao.i18n.gettext(
                                '"Write Anyway" to save your current version.'))))
                );
            jQuery('<button/>', {
                'class': 'btn btn-link',
                'type': 'button'
            }).append(Sao.i18n.gettext('Cancel')).click(function() {
                this.close(dialog);
                prm.reject();
            }.bind(this)).appendTo(dialog.footer);
            jQuery('<button/>', {
                'class': 'btn btn-default',
                'type': 'button'
            }).append(Sao.i18n.gettext('Compare')).click(function() {
                this.close(dialog);
                Sao.Tab.create({
                    'model': model,
                    'res_id': record_id,
                    'domain': [['id', '=', record_id]],
                    'context': context,
                    'mode': ['form', 'tree']
                });
                prm.reject();
            }.bind(this)).appendTo(dialog.footer);
            jQuery('<button/>', {
                'class': 'btn btn-default',
                'type': 'button'
            }).append(Sao.i18n.gettext('Write Anyway')).click(function() {
                this.close(dialog);
                prm.resolve();
            }.bind(this)).appendTo(dialog.footer);
            return dialog;
        }
    });
    Sao.common.concurrency = new Sao.common.ConcurrencyDialog();

    Sao.common.ErrorDialog = Sao.class_(Sao.common.UniqueDialog, {
        class_: 'error-dialog',
        build_dialog: function(title, details, prm) {
            var dialog = Sao.common.ConcurrencyDialog._super.build_dialog.call(
                this);
            dialog.modal.find('.modal-dialog'
                ).removeClass('modal-sm').addClass('modal-lg');
            dialog.add_title(Sao.i18n.gettext('Application Error'));
            dialog.body.append(jQuery('<div/>', {
                'class': 'alert alert-warning',
                role: 'alert'
            }).append(jQuery('<span/>', {
                'class': 'glyphicon glyphicon-alert',
                'aria-hidden': true
            })).append(jQuery('<span/>', {
                'class': 'sr-only'
            }).append(Sao.i18n.gettext('Warning: '))
            ).append(jQuery('<p/>')
                .append(jQuery('<pre/>')
                    .text(details)))
                .append(jQuery('<p/>')
                    .append(jQuery('<a/>', {
                        'class': 'btn btn-link',
                        href: Sao.config.roundup.url,
                        target: '_blank'
                    }).text(Sao.i18n.gettext('Report Bug')))));
            jQuery('<button/>', {
                'class': 'btn btn-primary',
                'type': 'button'
            }).append(Sao.i18n.gettext('Close')).click(function() {
                this.close(dialog);
                prm.resolve();
            }.bind(this)).appendTo(dialog.footer);
            return dialog;
        }
    });
    Sao.common.error = new Sao.common.ErrorDialog();

    Sao.common.Processing = Sao.class_(Object, {
        queries: 0,
        timeout: 500,
        init: function() {
            this.el = jQuery('<div/>', {
                'id': 'processing',
                'class': 'text-center'
            });
            this.el.append(jQuery('<span/>', {
                'class': 'label label-info',
                'text': 'Processing...'
            }));
            this.el.hide();
            jQuery(function() {
                this.el.appendTo('body');
            }.bind(this));
        },
        show: function() {
            return window.setTimeout(function() {
                this.queries += 1;
                this.el.show();
            }.bind(this), this.timeout);
        },
        hide: function(timeoutID) {
            window.clearTimeout(timeoutID);
            if (this.queries > 0) {
                this.queries -= 1;
            }
            if (this.queries <= 0) {
                this.queries = 0;
                this.el.hide();
            }
        }
    });
    Sao.common.processing = new Sao.common.Processing();

    Sao.common.InputCompletion = Sao.class_(Object, {
        init: function(el, source, match_selected, format) {
            if (!el.is('input')) {
                el.addClass('dropdown');
                this.dropdown = el;
            } else {
                el.wrap('<div class="dropdown"/>');
                this.dropdown = el.parent();
            }
            this.input = el.find('input').add(el.filter('input')).first();
            this.input.attr('autocomplete', 'off');
            // bootstrap requires an element with data-toggle
            jQuery('<span/>', {
                'data-toggle': 'dropdown'
            }).appendTo(this.dropdown);
            this.menu = jQuery('<ul/>', {
                'class': 'dropdown-menu',
                'role': 'listbox'
            }).appendTo(this.dropdown);
            this.separator = jQuery('<li/>', {
                'role': 'separator',
                'class': 'divider'
            }).appendTo(this.menu);
            this.separator.hide();

            this.source = source;
            this.match_selected = match_selected;
            this.format = format;
            this.action_activated = null;

            this._search_text = null;

            this.input.on('input', function() {
                window.setTimeout(this._input.bind(this), 300,
                        this.input.val());
            }.bind(this));
            this.input.keydown(function(evt) {
                if (evt.which == Sao.common.ESC_KEYCODE) {
                    if (this.dropdown.hasClass('open')) {
                        this.menu.dropdown('toggle');
                    }
                } else if (evt.which == Sao.common.RETURN_KEYCODE) {
                    if (!this.dropdown.hasClass('open')) {
                        this.menu.dropdown('toggle');
                    }
                }
            }.bind(this));
            // We must set the overflow of the treeview containing the input to
            // visible to prevent vertical scrollbar inherited from the auto
            // overflow-x
            // (see http://www.w3.org/TR/css-overflow-3/#overflow-properties)
            this.dropdown.on('hide.bs.dropdown', function() {
                this.input.focus();
                this.input.closest('.treeview').css('overflow', '');
            }.bind(this));
            this.dropdown.on('show.bs.dropdown', function() {
                this.input.closest('.treeview').css('overflow', 'visible');
            }.bind(this));
        },
        set_actions: function(actions, action_activated) {
            if (action_activated !== undefined) {
                this.action_activated = action_activated;
            }
            this.menu.find('li.action').remove();
            if (jQuery.isEmptyObject(actions)) {
                this.separator.hide();
                return;
            }
            this.separator.show();
            actions.forEach(function(action) {
                var action_id = action[0];
                var content = action[1];
                jQuery('<li/>', {
                    'class': 'action action-' + action_id
                }).append(jQuery('<a/>', {
                    'href': '#'
                }).append(this._format_action(content)))
                .click(function() {
                    if (this.action_activated) {
                        this.action_activated(action_id);
                    }
                    this.input.val('');
                }.bind(this))
                .appendTo(this.menu);
            }, this);
        },
        _format: function(content) {
            if (this.format) {
                return this.format(content);
            }
            return content;
        },
        _format_action: function(content) {
            if (this.format_action) {
                return this.format_action(content);
            }
            return content;
        },
        _input: function(text) {
            if (text != this.input.val()) {
                return;
            }
            var prm;
            if (this.source instanceof Array) {
                prm = jQuery.when(source.filter(function(value) {
                    return value.toLowerCase().startsWith(text.toLowerCase());
                }));
            } else {
                prm = this.source(text);
            }
            prm.then(function(values) {
                if (text != this.input.val()) {
                    return;
                }
                this._set_selection(values);
            }.bind(this));
        },
        _set_selection: function(values) {
            if (values === undefined) {
                values = [];
            }
            this.menu.find('li.completion').remove();
            values.reverse().forEach(function(value) {
                jQuery('<li/>', {
                    'class': 'completion'
                }).append(jQuery('<a/>', {
                    'href': '#'
                }).append(this._format(value)))
                .click(function() {
                    if (this.match_selected) {
                        this.match_selected(value);
                    }
                    this.input.focus();
                }.bind(this)).prependTo(this.menu);
            }, this);
            if (!this.input.val()) {
                if (this.dropdown.hasClass('open')) {
                    this.menu.dropdown('toggle');
                }
            } else {
                if (!this.dropdown.hasClass('open')) {
                    this.menu.dropdown('toggle');
                }
            }
        }
    });

    Sao.common.get_completion = function(el, source,
            match_selected, action_activated) {
        var format = function(content) {
            return content.rec_name;
        };
        var completion = new Sao.common.InputCompletion(
                el, source, match_selected, format);
        completion.set_actions([
                ['search', Sao.i18n.gettext('Search...')],
                ['create', Sao.i18n.gettext('Create...')]],
                action_activated);
    };

    Sao.common.update_completion = function(
            entry, record, field, model, domain) {
        var search_text = entry.val();
        if (!search_text || !model) {
            return jQuery.when();
        }
        if (domain === undefined) {
            domain = field.get_domain(record);
        }
        var context = field.get_context(record);
        domain = [['rec_name', 'ilike', '%' + search_text + '%'], domain];

        var sao_model = new Sao.Model(model);
        return sao_model.execute('search_read',
                [domain, 0, Sao.config.limit, null, ['rec_name']], context);
    };

    Sao.common.Paned = Sao.class_(Object, {
        init: function(orientation) {
            var row;
            this._orientation = orientation;
            this.el = jQuery('<div/>');
            if (orientation == 'horizontal') {
                row = jQuery('<div/>', {
                    'class': 'row'
                }).appendTo(this.el);
                this.child1 = jQuery('<div/>', {
                    'class': 'col-md-6'
                }).appendTo(row);
                this.child2 = jQuery('<div/>', {
                    'class': 'col-md-6'
                }).appendTo(row);
            } else if (orientation == 'vertical') {
                this.child1 = jQuery('<div/>', {
                    'class': 'row'
                }).appendTo(this.el);
                this.child2 = jQuery('<div/>', {
                    'class': 'row'
                }).appendTo(this.el);
            }
        },
        get_child1: function() {
            return this.child1;
        },
        get_child2: function() {
            return this.child2;
        }
    });

    Sao.common.get_focus_chain = function(element) {
        var elements = element.find('input', 'textarea');
        elements.sort(function(a, b) {
            if (('tabindex' in a.attributes) && ('tabindex' in b.attributes)) {
                var a_tabindex = parseInt(a.attributes.tabindex.value);
                var b_tabindex = parseInt(b.attributes.tabindex.value);
                return a_tabindex - b_tabindex;
            } else if ('tabindex' in a.attributes) {
                return -1;
            } else if ('tabindex' in b.attributes) {
                return 1;
            } else {
                return 0;
            }
        });
        return elements;
    };

    Sao.common.find_focusable_child = function(element) {
        var i, len, children, focusable;

        if (!element.is(':visible')) {
            return null;
        }
        if (~['input', 'select', 'textarea'].indexOf(
                    element[0].tagName.toLowerCase())) {
            return element;
        }

        children = Sao.common.get_focus_chain(element);
        for (i = 0, len = children.length; i < len; i++) {
            focusable = Sao.common.find_focusable_child(jQuery(children[i]));
            if (focusable) {
                return focusable;
            }
        }
    };

    Sao.common.find_first_focus_widget = function(ancestor, widgets) {
        var i, j;
        var children, commons, is_common;

        if (widgets.length == 1) {
            return jQuery(widgets[0]);
        }
        children = Sao.common.get_focus_chain(ancestor);
        for (i = 0; i < children.length; i++) {
            commons = [];
            for (j = 0; j < widgets.length; j++) {
                is_common = jQuery(widgets[j]).closest(children[i]).length > 0;
                if (is_common) {
                    commons.push(widgets[j]);
                }
            }
            if (commons.length > 0) {
                return Sao.common.find_first_focus_widget(jQuery(children[i]),
                        commons);
            }
        }
    };
}());

/* This file is part of Tryton.  The COPYRIGHT file at the top level of
   this repository contains the full copyright notices and license terms. */
(function() {
    'use strict';

    Sao.Window = {};

    Sao.Window.InfoBar = Sao.class_(Object, {
        init: function() {
            this.text = jQuery('<span/>');
            this.text.css('white-space', 'pre-wrap');
            this.el = jQuery('<div/>', {
                'class': 'alert',
                'role': 'alert'
            }).append(jQuery('<button/>', {
                'type': 'button',
                'class': 'close',
                'aria-label': Sao.i18n.gettext('Close')
            }).append(jQuery('<span/>', {
                'aria-hidden': true
            }).append('&times;')).click(function() {
                this.el.hide();
            }.bind(this))).append(this.text);
            this.el.hide();
        },
        message: function(message, type) {
            if (message) {
                this.el.removeClass(
                        'alert-success alert-info alert-warning alert-danger');
                this.el.addClass('alert-' + (type || 'info'));
                this.text.text(message);
                this.el.show();
            } else {
                this.el.hide();
            }
        }
    });

    Sao.Window.Form = Sao.class_(Object, {
        init: function(screen, callback, kwargs) {
            kwargs = kwargs || {};
            this.screen = screen;
            this.callback = callback;
            this.many = kwargs.many || 0;
            this.domain = kwargs.domain || null;
            this.context = kwargs.context || null;
            this.save_current = kwargs.save_current;
            this.prev_view = screen.current_view;
            this.screen.screen_container.alternate_view = true;
            this.info_bar = new Sao.Window.InfoBar();
            var view_type = kwargs.view_type || 'form';

            var form_prm = jQuery.when();
            var screen_views = [];
            for (var i = 0, len = this.screen.views.length; i < len; i++) {
                screen_views.push(this.screen.views[i].view_type);
            }
            if (!~screen_views.indexOf(view_type) &&
                !~this.screen.view_to_load.indexOf(view_type)) {
                form_prm = this.screen.add_view_id(null, view_type);
            }

            var switch_prm = form_prm.then(function() {
                return this.screen.switch_view(view_type).done(function() {
                    if (kwargs.new_) {
                        this.screen.new_();
                    }
                }.bind(this));
            }.bind(this));
            var dialog = new Sao.Dialog('', '', 'lg');
            this.el = dialog.modal;

            dialog.body.append(this.info_bar.el);

            var readonly = (this.screen.attributes.readonly ||
                    this.screen.group.get_readonly());

            if (view_type == 'form') {
                dialog.footer.append(jQuery('<button/>', {
                    'class': 'btn btn-link',
                    'type': 'button'
                }).append(!kwargs.new_ && this.screen.current_record.id < 0 ?
                    Sao.i18n.gettext('Delete') : Sao.i18n.gettext('Cancel'))
                        .click(function() {
                            this.response('RESPONSE_CANCEL');
                        }.bind(this)));
            }

            if (kwargs.new_ && this.many) {
                dialog.footer.append(jQuery('<button/>', {
                    'class': 'btn btn-default',
                    'type': 'button'
                }).append(Sao.i18n.gettext('New')).click(function() {
                    this.response('RESPONSE_ACCEPT');
                }.bind(this)));
            }

            if (this.save_current) {
                dialog.footer.append(jQuery('<button/>', {
                    'class': 'btn btn-primary',
                    'type': 'submit'
                }).append(Sao.i18n.gettext('Save')));
            } else {
                dialog.footer.append(jQuery('<button/>', {
                    'class': 'btn btn-primary',
                    'type': 'submit'
                }).append(Sao.i18n.gettext('OK')));
            }
            dialog.content.submit(function(e) {
                this.response('RESPONSE_OK');
                e.preventDefault();
            }.bind(this));

            if (view_type == 'tree') {
                var menu = jQuery('<div/>').appendTo(dialog.body);
                var group = jQuery('<div/>', {
                    'class': 'input-group input-group-sm'
                }).appendTo(menu);

                this.wid_text = jQuery('<input/>', {
                    type: 'input'
                }).appendTo(menu);
                this.wid_text.hide();

                var buttons = jQuery('<div/>', {
                    'class': 'input-group-btn'
                }).appendTo(group);
                var access = Sao.common.MODELACCESS.get(this.screen.model_name);
                if (this.domain) {
                    this.wid_text.show();

                    this.but_add = jQuery('<button/>', {
                        'class': 'btn btn-default btn-sm',
                        'type': 'button',
                        'aria-label': Sao.i18n.gettext('Add')
                    }).append(jQuery('<span/>', {
                        'class': 'glyphicon glyphicon-plus'
                    })).appendTo(buttons);
                    this.but_add.click(this.add.bind(this));
                    this.but_add.prop('disabled', !access.read || readonly);

                    this.but_remove = jQuery('<button/>', {
                        'class': 'btn btn-default btn-sm',
                        'type': 'button',
                        'aria-label': Sao.i18n.gettext('Remove')
                    }).append(jQuery('<span/>', {
                        'class': 'glyphicon glyphicon-minus'
                    })).appendTo(buttons);
                    this.but_remove.click(this.remove.bind(this));
                    this.but_remove.prop('disabled', !access.read || readonly);
                }

                this.but_new = jQuery('<button/>', {
                    'class': 'btn btn-default btn-sm',
                    'type': 'button',
                    'aria-label': Sao.i18n.gettext('New')
                }).append(jQuery('<span/>', {
                    'class': 'glyphicon glyphicon-edit'
                })).appendTo(buttons);
                this.but_new.click(this.new_.bind(this));
                this.but_new.prop('disabled', !access.create || readonly);

                this.but_del = jQuery('<button/>', {
                    'class': 'btn btn-default btn-sm',
                    'type': 'button',
                    'aria-label': Sao.i18n.gettext('Delete')
                }).append(jQuery('<span/>', {
                    'class': 'glyphicon glyphicon-trash'
                })).appendTo(buttons);
                this.but_del.click(this.delete_.bind(this));
                this.but_del.prop('disabled', !access['delete'] || readonly);

                this.but_undel = jQuery('<button/>', {
                    'class': 'btn btn-default btn-sm',
                    'type': 'button',
                    'aria-label': Sao.i18n.gettext('Undelete')
                }).append(jQuery('<span/>', {
                    'class': 'glyphicon glyphicon-repeat'
                })).appendTo(buttons);
                this.but_undel.click(this.undelete.bind(this));
                this.but_undel.prop('disabled', !access['delete'] || readonly);

                this.but_previous = jQuery('<button/>', {
                    'class': 'btn btn-default btn-sm',
                    'type': 'button',
                    'aria-label': Sao.i18n.gettext('Previous')
                }).append(jQuery('<span/>', {
                    'class': 'glyphicon glyphicon-chevron-left'
                })).appendTo(buttons);
                this.but_previous.click(this.previous.bind(this));

                this.label = jQuery('<span/>', {
                    'class': 'btn'
                }).appendTo(buttons);
                this.label.text('(0, 0)');

                this.but_next = jQuery('<button/>', {
                    'class': 'btn btn-default btn-sm',
                    'type': 'button',
                    'aria-label': Sao.i18n.gettext('Next')
                }).append(jQuery('<span/>', {
                    'class': 'glyphicon glyphicon-chevron-right'
                })).appendTo(buttons);
                this.but_next.click(this.next.bind(this));

                this.but_switch = jQuery('<button/>', {
                    'class': 'btn btn-default btn-sm',
                    'type': 'button',
                    'aria-label': Sao.i18n.gettext('Switch')
                }).append(jQuery('<span/>', {
                    'class': 'glyphicon glyphicon-list-alt'
                })).appendTo(buttons);
                this.but_switch.click(this.switch_.bind(this));
            }


            switch_prm.done(function() {
                dialog.add_title(this.screen.current_view.attributes.string);
                dialog.body.append(this.screen.screen_container.alternate_viewport);
                this.el.modal('show');
            }.bind(this));
            this.el.on('shown.bs.modal', function(event) {
                this.screen.display().done(function() {
                    this.screen.set_cursor();
                }.bind(this));
            }.bind(this));
            this.el.on('hidden.bs.modal', function(event) {
                jQuery(this).remove();
            });

        },
        add: function() {
            var domain = jQuery.extend([], this.domain);
            var model_name = this.screen.model_name;
            var value = this.wid_text.val();

            var callback = function(result) {
                var prm = jQuery.when();
                if (!jQuery.isEmptyObject(result)) {
                    var ids = [];
                    for (var i = 0, len = result.length; i < len; i++) {
                        ids.push(result[i][0]);
                    }
                    this.screen.group.load(ids, true);
                    prm = this.screen.display();
                }
                prm.done(function() {
                    this.screen.set_cursor();
                }.bind(this));
                this.entry.val('');
            }.bind(this);
            var parser = new Sao.common.DomainParser();
            var win = new Sao.Window.Search(model_name, callback, {
                sel_multi: true,
                context: this.context,
                domain: domain,
                search_filter: parser.quote(value)
            });
        },
        remove: function() {
            this.screen.remove(false, true, false);
        },
        new_: function() {
            this.screen.new_();
        },
        delete_: function() {
            this.screen.remove(false, false, false);
        },
        undelete: function() {
            this.screen.unremove();
        },
        previous: function() {
            this.screen.display_previous();
        },
        next: function() {
            this.screen.display_next();
        },
        switch_: function() {
            this.screen.switch_view();
        },
        response: function(response_id) {
            var result;
            this.screen.current_view.set_value();
            var readonly = this.screen.group.get_readonly();
            if (~['RESPONSE_OK', 'RESPONSE_ACCEPT'].indexOf(response_id) &&
                    !readonly &&
                    this.screen.current_record) {
                this.screen.current_record.validate().then(function(validate) {
                    if (validate && this.screen.attributes.pre_validate) {
                        return this.screen.current_record.pre_validate();
                    }
                    return validate;
                }.bind(this)).then(function(validate) {
                    var closing_prm = jQuery.Deferred();
                    if (validate && this.save_current) {
                        this.screen.save_current().then(closing_prm.resolve,
                            closing_prm.reject);
                    } else if (validate &&
                            this.screen.current_view.view_type == 'form') {
                        var view = this.screen.current_view;
                        var validate_prms = [];
                        for (var name in view.widgets) {
                            var widget = view.widgets[name];
                            if (widget.screen &&
                                widget.screen.attributes.pre_validate) {
                                var record = widget.screen.current_record;
                                if (record) {
                                    validate_prms.push(record.pre_validate());
                                }
                            }
                        }
                        jQuery.when.apply(jQuery, validate_prms).then(
                            closing_prm.resolve, closing_prm.reject);
                    } else if (!validate) {
                        this.info_bar.message(
                            this.screen.invalid_message(), 'danger');
                        closing_prm.reject();
                    } else {
                        this.info_bar.message();
                        closing_prm.resolve();
                    }

                    closing_prm.fail(function() {
                        this.screen.display().done(function() {
                            this.screen.set_cursor();
                        }.bind(this));
                    }.bind(this));

                    // TODO Add support for many
                    closing_prm.done(function() {
                        if (response_id == 'RESPONSE_ACCEPT') {
                            this.screen.new_();
                            this.screen.current_view.display().done(function() {
                                this.screen.set_cursor();
                            }.bind(this));
                            this.many -= 1;
                            if (this.many === 0) {
                                this.but_new.prop('disabled', true);
                            }
                        } else {
                            result = true;
                            this.callback(result);
                            this.destroy();
                        }
                    }.bind(this));
                }.bind(this));
                return;
            }

            if (response_id == 'RESPONSE_CANCEL' &&
                    !readonly &&
                    this.screen.current_record) {
                result = false;
                if ((this.screen.current_record.id < 0) || this.save_current) {
                    this.screen.group.remove(this.screen.current_record, true);
                } else if (this.screen.current_record.has_changed()) {
                    this.screen.current_record.cancel();
                    this.screen.current_record.reload().always(function() {
                        this.callback(result);
                        this.destroy();
                    }.bind(this));
                    return;
                }
            } else {
                result = response_id != 'RESPONSE_CANCEL';
            }
            this.callback(result);
            this.destroy();
        },
        destroy: function() {
            this.screen.screen_container.alternate_view = false;
            this.screen.screen_container.alternate_viewport.children()
                .detach();
            if (this.prev_view) {
                // Empty when opening from Many2One
                this.screen.switch_view(this.prev_view.view_type);
            }
            this.el.modal('hide');
        }
    });

    Sao.Window.Attachment = Sao.class_(Sao.Window.Form, {
        init: function(record, callback) {
            this.resource = record.model.name + ',' + record.id;
            this.attachment_callback = callback;
            var context = jQuery.extend({}, record.get_context());
            context.resource = this.resource;
            var screen = new Sao.Screen('ir.attachment', {
                domain: [['resource', '=', this.resource]],
                mode: ['tree', 'form'],
                context: context,
                exclude_field: 'resource'
            });
            screen.switch_view().done(function() {
                screen.search_filter();
            });
            Sao.Window.Attachment._super.init.call(this, screen, this.callback,
                {view_type: 'tree'});
        },
        callback: function(result) {
            var prm = jQuery.when();
            if (result) {
                var resource = this.screen.group.model.fields.resource;
                this.screen.group.forEach(function(record) {
                    resource.set_client(record, this.resource);
                }.bind(this));
                prm = this.screen.group.save();
            }
            if (this.attachment_callback) {
                prm.always(this.attachment_callback.bind(this));
            }
        }
    });

    Sao.Window.Note = Sao.class_(Sao.Window.Form, {
        init: function(record, callback) {
            this.resource = record.model.name + ',' + record.id;
            this.note_callback = callback;
            var context = record.get_context();
            context.resource = this.resource;
            var screen = new Sao.Screen('ir.note', {
                domain: [['resource', '=', this.resource]],
                mode: ['tree', 'form'],
                context: context,
                exclude_field: 'resource'
            });
            screen.switch_view().done(function() {
                screen.search_filter();
            });
            Sao.Window.Note._super.init.call(this, screen, this.callback,
                    {view_type: 'tree'});
        },
        callback: function(result) {
            var prm = jQuery.when();
            if (result) {
                var resource = this.screen.group.model.fields.resource;
                var unread = this.screen.group.model.fields.unread;
                this.screen.group.forEach(function(record) {
                    if (record.get_loaded() || record.id < 0) {
                        resource.set_client(record, this.resource);
                        if (!record._changed.unread) {
                            unread.set_client(record, false);
                        }
                    }
                }.bind(this));
                prm = this.screen.group.save();
            }
            if (this.note_callback) {
                prm.always(this.note_callback.bind(this));
            }
        }
    });

    Sao.Window.Search = Sao.class_(Object, {
        init: function(model, callback, kwargs) {
            kwargs = kwargs || {};
            var views_preload = kwargs.views_preload || {};
            this.model_name = model;
            this.domain = kwargs.domain || [];
            this.context = kwargs.context || {};
            this.sel_multi = kwargs.sel_multi;
            this.callback = callback;
            var dialog = new Sao.Dialog('Search', '', 'lg');
            this.el = dialog.modal;

            jQuery('<button/>', {
                'class': 'btn btn-link',
                'type': 'button'
            }).append(Sao.i18n.gettext('Cancel')).click(function() {
                this.response('RESPONSE_CANCEL');
            }.bind(this)).appendTo(dialog.footer);
            jQuery('<button/>', {
                'class': 'btn btn-default',
                'type': 'button'
            }).append(Sao.i18n.gettext('Find')).click(function() {
                this.response('RESPONSE_APPLY');
            }.bind(this)).appendTo(dialog.footer);
            if (kwargs.new_ && Sao.common.MODELACCESS.get(model).create) {
                jQuery('<button/>', {
                    'class': 'btn btn-default',
                    'type': 'button'
                }).append(Sao.i18n.gettext('New')).click(function() {
                    this.response('RESPONSE_ACCEPT');
                }.bind(this)).appendTo(dialog.footer);
            }
            jQuery('<button/>', {
                'class': 'btn btn-primary',
                'type': 'submit'
            }).append(Sao.i18n.gettext('OK')).appendTo(dialog.footer);
            dialog.content.submit(function(e) {
                this.response('RESPONSE_OK');
                e.preventDefault();
            }.bind(this));

            this.screen = new Sao.Screen(model, {
                mode: ['tree'],
                context: this.context,
                domain: this.domain,
                view_ids: kwargs.view_ids,
                views_preload: views_preload,
                row_activate: this.activate.bind(this),
                editable: false
            });
            this.screen.load_next_view().done(function() {
                this.screen.switch_view().done(function() {
                    dialog.body.append(this.screen.screen_container.el);
                    this.el.modal('show');
                    this.screen.display();
                    if (kwargs.search_filter !== undefined) {
                        this.screen.search_filter(kwargs.search_filter);
                    }
                }.bind(this));
            }.bind(this));
            this.el.on('hidden.bs.modal', function(event) {
                jQuery(this).remove();
            });
        },
        activate: function() {
            this.response('RESPONSE_OK');
        },
        response: function(response_id) {
            var records;
            var value = [];
            if (response_id == 'RESPONSE_OK') {
                records = this.screen.current_view.selected_records();
            } else if (response_id == 'RESPONSE_APPLY') {
                this.screen.search_filter();
                return;
            } else if (response_id == 'RESPONSE_ACCEPT') {
                var screen = new Sao.Screen(this.model_name, {
                    domain: this.domain,
                    context: this.context,
                    mode: ['form']
                });

                var callback = function(result) {
                    if (result) {
                        screen.save_current().then(function() {
                            var record = screen.current_record;
                            this.callback([[record.id,
                                record._values.rec_name || '']]);
                        }.bind(this), function() {
                            this.callback(null);
                        }.bind(this));
                    } else {
                        this.callback(null);
                    }
                };
                this.el.modal('hide');
                new Sao.Window.Form(screen, callback.bind(this), {
                    new_: true
                });
                return;
            }
            if (records) {
                var index, record;
                for (index in records) {
                    record = records[index];
                    value.push([record.id, record._values.rec_name || '']);
                }
            }
            this.callback(value);
            this.el.modal('hide');
        }
    });

    Sao.Window.Preferences = Sao.class_(Object, {
        init: function(callback) {
            this.callback = callback;
            var dialog = new Sao.Dialog('Preferences', '', 'lg');
            this.el = dialog.modal;

            jQuery('<button/>', {
                'class': 'btn btn-link',
                'type': 'button'
            }).append(Sao.i18n.gettext('Cancel')).click(function() {
                this.response('RESPONSE_CANCEL');
            }.bind(this)).appendTo(dialog.footer);
            jQuery('<button/>', {
                'class': 'btn btn-primary',
                'type': 'submit'
            }).append(Sao.i18n.gettext('OK')).appendTo(dialog.footer);
            dialog.content.submit(function(e) {
                this.response('RESPONSE_OK');
                e.preventDefault();
            }.bind(this));

            this.screen = new Sao.Screen('res.user', {
                mode: []
            });
            // Reset readonly set automaticly by MODELACCESS
            this.screen.attributes.readonly = false;
            this.screen.group.set_readonly(false);
            this.screen.group.skip_model_access = true;

            var set_view = function(view) {
                this.screen.add_view(view);
                this.screen.switch_view().done(function() {
                    this.screen.new_(false);
                    this.screen.model.execute('get_preferences', [false], {})
                    .then(set_preferences.bind(this), this.destroy);
                }.bind(this));
            };
            var set_preferences = function(preferences) {
                this.screen.current_record.set(preferences);
                this.screen.current_record.id =
                    this.screen.model.session.user_id;
                this.screen.current_record.validate(null, true).then(
                        function() {
                            this.screen.display(true);
                        }.bind(this));
                dialog.body.append(this.screen.screen_container.el);
                this.el.modal('show');
            };
            this.el.on('hidden.bs.modal', function(event) {
                jQuery(this).remove();
            });

            this.screen.model.execute('get_preferences_fields_view', [], {})
                .then(set_view.bind(this), this.destroy);
        },
        response: function(response_id) {
            var end = function() {
                this.destroy();
                this.callback();
            }.bind(this);
            var prm = jQuery.when();
            if (response_id == 'RESPONSE_OK') {
                prm = this.screen.current_record.validate()
                    .then(function(validate) {
                        if (validate) {
                            var values = jQuery.extend({}, this.screen.get());
                            var set_preferences = function(password) {
                                return this.screen.model.execute(
                                    'set_preferences', [values, password], {});
                            }.bind(this);
                            if ('password' in values) {
                                return Sao.common.ask.run(
                                    'Current Password:', false)
                                    .then(function(password) {
                                        return set_preferences(password);
                                    });
                            } else {
                                return set_preferences(false);
                            }
                        }
                    }.bind(this));
            }
            prm.done(end);
        },
        destroy: function() {
            this.el.modal('hide');
        }
    });

    Sao.Window.Revision = Sao.class_(Object, {
        init: function(revisions, callback) {
            this.callback = callback;
            var dialog = new Sao.Dialog(
                    Sao.i18n.gettext('Revision'), '', 'lg');
            this.el = dialog.modal;

            jQuery('<button/>', {
                'class': 'btn btn-link',
                'type': 'button'
            }).append(Sao.i18n.gettext('Cancel')).click(function() {
                this.response('RESPONSE_CANCEL');
            }.bind(this)).appendTo(dialog.footer);
            jQuery('<button/>', {
                'class': 'btn btn-primary',
                'type': 'submit'
            }).append(Sao.i18n.gettext('OK')).appendTo(dialog.footer);
            dialog.content.submit(function(e) {
                this.response('RESPONSE_OK');
                e.preventDefault();
            }.bind(this));

            var group = jQuery('<div/>', {
                'class': 'form-group'
            }).appendTo(dialog.body);
            jQuery('<label/>', {
                'for': 'revision',
                'text': 'Revision'
            }).appendTo(group);
            this.select = jQuery('<select/>', {
                'class': 'form-control',
                id: 'revision',
                'placeholder': Sao.i18n.gettext('Revision')
            }).appendTo(group);
            var date_format = Sao.common.date_format();
            var time_format = '%H:%M:%S.%f';
            this.select.append(jQuery('<option/>', {
                value: null,
                text: ''
            }));
            revisions.forEach(function(revision) {
                var name = revision[2];
                revision = revision[0];
                this.select.append(jQuery('<option/>', {
                    value: revision.valueOf(),
                    text: Sao.common.format_datetime(
                        date_format, time_format, revision) + ' ' + name
                }));
            }.bind(this));
            this.el.modal('show');
            this.el.on('hidden.bs.modal', function(event) {
                jQuery(this).remove();
            });
        },
        response: function(response_id) {
            var revision = null;
            if (response_id == 'RESPONSE_OK') {
                revision = this.select.val();
                if (revision) {
                    revision = Sao.DateTime(parseInt(revision, 10));
                }
            }
            this.el.modal('hide');
            this.callback(revision);
        }
    });
}());

/* This file is part of Tryton.  The COPYRIGHT file at the top level of
   this repository contains the full copyright notices and license terms. */
(function() {
    'use strict';

    Sao.Wizard = Sao.class_(Object, {
        init: function(name) {
            this.widget = jQuery('<div/>', {
                'class': 'wizard'
            });
            this.name = name;
            this.action_id = null;
            this.id = null;
            this.ids = null;
            this.action = null;
            this.context = null;
            this.states = {};
            this.session_id = null;
            this.start_state = null;
            this.end_state = null;
            this.screen = null;
            this.screen_state = null;
            this.state = null;
            this.session = Sao.Session.current_session;
            this.__processing = false;
            this.__waiting_response = false;
            this.info_bar = new Sao.Window.InfoBar();
        },
        run: function(attributes) {
            this.action = attributes.action;
            this.action_id = attributes.data.action_id;
            this.id = attributes.data.id;
            this.ids = attributes.data.ids;
            this.model = attributes.data.model;
            this.context = attributes.context;
            Sao.rpc({
                'method': 'wizard.' + this.action + '.create',
                'params': [this.session.context]
            }, this.session).then(function(result) {
                this.session_id = result[0];
                this.start_state = this.state = result[1];
                this.end_state = result[2];
                this.process();
            }.bind(this));
        },
        process: function() {
            if (this.__processing || this.__waiting_response) {
                return;
            }
            var process = function() {
                if (this.state == this.end_state) {
                    this.end();
                    return;
                }
                var ctx = jQuery.extend({}, this.context);
                ctx.active_id = this.id;
                ctx.active_ids = this.ids;
                ctx.active_model = this.model;
                ctx.action_id = this.action_id;
                var data = {};
                if (this.screen) {
                    data[this.screen_state] = this.screen.get_on_change_value();
                }
                Sao.rpc({
                    'method': 'wizard.' + this.action + '.execute',
                    'params': [this.session_id, data, this.state, ctx]
                }, this.session).then(function(result) {
                    if (result.view) {
                        this.clean();
                        var view = result.view;
                        this.update(view.fields_view, view.defaults,
                            view.buttons);
                        this.screen_state = view.state;
                        this.__waiting_response = true;
                    } else {
                        this.state = this.end_state;
                    }

                    var execute_actions = function execute_actions() {
                        if (result.actions) {
                            result.actions.forEach(function(action) {
                                Sao.Action.exec_action(action[0], action[1],
                                    jQuery.extend({}, this.context));
                            }.bind(this));
                        }
                    }.bind(this);

                    if (this.state == this.end_state) {
                        this.end().then(execute_actions);
                    } else {
                        execute_actions();
                    }
                    this.__processing = false;
                }.bind(this), function(result) {
                    // TODO end for server error.
                    this.__processing = false;
                }.bind(this));
            };
            process.call(this);
        },
        destroy: function() {
            // TODO
        },
        end: function() {
            return Sao.rpc({
                'method': 'wizard.' + this.action + '.delete',
                'params': [this.session_id, this.session.context]
            }, this.session);
        },
        clean: function() {
            this.widget.children().remove();
            this.states = {};
        },
        response: function(state) {
            this.__waiting_response = false;
            this.screen.current_view.set_value();
            return this.screen.current_record.validate().then(function(validate) {
                if ((!validate) && state != this.end_state) {
                    this.screen.display(true);
                    this.info_bar.message(
                        this.screen.invalid_message(), 'danger');
                    return;
                }
                this.info_bar.message();
                this.state = state;
                this.process();
            }.bind(this));
        },
        _get_button: function(definition) {
            var button = new Sao.common.Button(definition);
            this.states[definition.state] = button;
            if (definition.default) {
                button.el.addClass('btn-primary');
            } else if (definition.state == this.end_state) {
                button.el.addClass('btn-link');
            }
            return button;
        },
        update: function(view, defaults, buttons) {
            buttons.forEach(function(button) {
                this._get_button(button);
            }.bind(this));
            this.screen = new Sao.Screen(view.model,
                    {mode: [], context: this.context});
            this.screen.add_view(view);
            this.screen.switch_view();
            // TODO record-modified
            // TODO title
            // TODO toolbar
            this.widget.append(this.screen.screen_container.el);

            this.screen.new_(false).then(function(){
                return this.screen.current_record.set_default(defaults);
            }.bind(this));
            this.screen.set_cursor();
        }
    });

    Sao.Wizard.create = function(attributes) {
        var win;
        if (attributes.window) {
            win = new Sao.Wizard.Form(attributes.name);
            var tab = new Sao.Tab.Wizard(win);
            Sao.Tab.add(tab);
        } else {
            win = new Sao.Wizard.Dialog(attributes.name);
        }
        win.run(attributes);
    };

    Sao.Wizard.Form = Sao.class_(Sao.Wizard, {
        init: function(name) {
            Sao.Wizard.Form._super.init.call(this);
            this.tab = null;  // Filled by Sao.Tab.Wizard
            this.name = name;

            this.form = jQuery('<div/>', {
                'class': 'wizard-form',
            }).append(this.widget);
            this.footer = jQuery('<div/>', {
                'class': 'modal-footer'
            }).appendTo(this.form);
        },
        clean: function() {
            Sao.Wizard.Form._super.clean.call(this);
            this.footer.children().remove();
        },
        _get_button: function(definition) {
            var button = Sao.Wizard.Form._super._get_button.call(this,
                definition);
            this.footer.append(button.el);
            button.el.click(function() {
                this.response(definition.state);
            }.bind(this));
            return button;
        },
        end: function() {
            return Sao.Wizard.Form._super.end.call(this).always(function() {
                return this.tab.close();
            }.bind(this));
        }
    });

    Sao.Wizard.Dialog = Sao.class_(Sao.Wizard, { // TODO nomodal
        init: function(name) {
            if (!name) {
                name = Sao.i18n.gettext('Wizard');
            }
            Sao.Wizard.Dialog._super.init.call(this);
            var dialog = new Sao.Dialog(name, 'wizard-dialog', 'lg');
            this.dialog = dialog.modal;
            this.content = dialog.content;
            this.footer = dialog.footer;
            dialog.body.append(this.info_bar.el).append(this.widget);
        },
        clean: function() {
            Sao.Wizard.Dialog._super.clean.call(this);
            this.footer.children().remove();
        },
        _get_button: function(definition) {
            var button = Sao.Wizard.Dialog._super._get_button.call(this,
                    definition);
            this.footer.append(button.el);
            if (definition['default']) {
                this.content.unbind('submit');
                this.content.submit(function(e) {
                    this.response(definition.state);
                    e.preventDefault();
                }.bind(this));
                button.el.attr('type', 'submit');
            } else {
                button.el.click(function() {
                    this.response(definition.state);
                }.bind(this));
            }
            return button;
        },
        update: function(view, defaults, buttons) {
            this.content.unbind('submit');
            Sao.Wizard.Dialog._super.update.call(this, view, defaults,
                    buttons);
            this.dialog.modal('show');
        },
        destroy: function(action) {
            Sao.Wizard.Dialog._super.destroy.call(this);
            this.dialog.on('hidden.bs.modal', function(event) {
                this.dialog.remove();
                var dialog = jQuery('.wizard-dialog').filter(':visible')[0];
                var is_menu = false;
                var screen;
                if (!dialog) {
                    dialog = Sao.Tab.tabs.get_current();
                    if (dialog) {
                        if (dialog.screen &&
                               dialog.screen.model_name != this.model) {
                            is_menu = true;
                            screen = Sao.main_menu_screen;
                        }
                    } else {
                        is_menu = true;
                        screen = Sao.main_menu_screen;
                    }
                }
                if (dialog && dialog.screen) {
                    screen = dialog.screen;
                }
                if (screen) {
                    if (screen.current_record && !is_menu) {
                        var ids;
                        if (screen.model_name == this.model) {
                            ids = this.ids;
                        } else {
                            // Wizard run form a children record so reload
                            // parent record
                            ids = [screen.current_record.id];
                        }
                        screen.reload(ids, true);
                    }
                    if (action) {
                        screen.client_action(action);
                    }
                }
            }.bind(this));
            if (this.dialog.is(':visible')) {
                this.dialog.modal('hide');
            } else {
                this.dialog.trigger('hidden.bs.modal');
            }
        },
        end: function() {
            return Sao.Wizard.Dialog._super.end.call(this).then(
                    this.destroy.bind(this));
        },
        show: function() {
            this.dialog.modal('show');
        },
        hide: function() {
            this.dialog.modal('hide');
        },
        state_changed: function() {
            this.process();
        }
    });

}());

/* This file is part of Tryton.  The COPYRIGHT file at the top level of
   this repository contains the full copyright notices and license terms. */
(function() {
    'use strict';

    Sao.View.Board = Sao.class_(Object, {
        init: function(view_xml, context) {
            var attributes, attribute, node, actions_prms;

            this.context = context;
            this.widgets = [];
            this.actions = [];
            this.el = jQuery('<div/>', {
                'class': 'board'
            });

            attributes = {};
            node = view_xml.children()[0];
            for (var i = 0, len = node.attributes.length; i < len; i++) {
                attribute = node.attributes[i];
                attributes[attribute.name] = attribute.value;
            }
            this.attributes = attributes;
            this.el.append(this.parse(node).el);

            actions_prms = [];
            for (i = 0, len = this.actions.length; i < len; i++) {
                actions_prms.push(this.actions[i].action_prm);
            }
            this.actions_prms = jQuery.when.apply(jQuery, actions_prms);
        },
        _parse_node: function(child, container, attributes) {
            switch (child.tagName) {
                case 'image':
                    break;
                case 'separator':
                    this._parse_separator(child, container, attributes);
                    break;
                case 'label':
                    this._parse_label(child, container, attributes);
                    break;
                case 'newline':
                    container.add_row();
                    break;
                case 'notebook':
                    this._parse_notebook(child, container, attributes);
                    break;
                case 'page':
                    this._parse_page(child, container, attributes);
                    break;
                case 'group':
                    this._parse_group(child, container, attributes);
                    break;
                case 'hpaned':
                    this._parse_pane(child, container, attributes,
                            'horizontal');
                    break;
                case 'vpaned':
                    this._parse_pane(child, container, attributes,
                            'vertical');
                    break;
                case 'child':
                    this._parse_child(child, container, attributes);
                    break;
                case 'action':
                    this._parse_action(child, container, attributes);
                    break;
            }
        },
        parse: function(node, container) {
            var _parse;
            if (!container) {
                container = new Sao.View.Form.Container(
                        Number(node.getAttribute('col') || 4));
            }
            _parse = function(index, child) {
                var attributes, attribute;
                var i, len;
                attributes = {};
                for (i = 0, len = child.attributes.length; i < len; i++) {
                    attribute = child.attributes[i];
                    attributes[attribute.name] = attribute.value;
                }
                ['yexpand', 'yfill', 'xexpand', 'xfill', 'colspan',
                 'position'].forEach(function(name) {
                     if (attributes[name]) {
                         attributes[name] = Number(attributes[name]);
                     }
                });
                this._parse_node(child, container, attributes);
            };
            jQuery(node).children().each(_parse.bind(this));
            return container;
        },
        _parse_separator: function(node, container, attributes) {
            var text, separator;
            text = attributes.string;
            separator = new Sao.view.Form.Separator(text, attributes);
            container.add(attributes, separator);
        },
        _parse_label: function(node, container, attributes) {
            var text, label;
            text = attributes.string;
            if (!text) {
                container.add(attributes);
                return;
            }
            label = new Sao.View.Form.Label(text, attributes);
            container.add(attributes, label);
        },
        _parse_notebook: function(node, container, attributes) {
            var notebook;
            if (attributes.yexpand === undefined) {
                attributes.yexpand = true;
            }
            if (attributes.yfill === undefined) {
                attributes.yfill = true;
            }
            notebook = new Sao.View.Form.Notebook(attributes);
            container.add(attributes, notebook);
            this.parse(node, container);
        },
        _parse_page: function(node, container, attributes) {
            var text;
            text = attributes.string;
            page = this.parse(node, container);
            page = new Sao.View.Form.Page(container.add(page.el, text),
                    attributes);
        },
        _parse_group: function(node, container, attributes) {
            var group;
            group = new Sao.View.Form.Group(attributes);
            container.add(attributes, group);
        },
        _parse_pane: function(node, container, attributes, orientation) {
            var paned;
            if (attributes.yexpand === undefined) {
                attributes.yexpand = true;
            }
            if (attributes.yfill === undefined) {
                attributes.yfill = true;
            }
            paned = new Sao.common.Paned(orientation);
            container.add(attributes, paned);
            this.parse(node, paned);
        },
        _parse_child: function(node, paned, attributes) {
            var container, child1, child2;
            container = this.parse(node);
            child1 = paned.get_child1();
            if (child1.children().length > 0) {
                child2 = paned.get_child2();
                child2.append(container.el);
            } else {
                child1.append(container.el);
            }
        },
        _parse_action: function(node, container, attributes) {
            var action;
            if (attributes.yexpand === undefined) {
                attributes.yexpand = true;
            }
            if (attributes.yfill === undefined) {
                attributes.yfill = true;
            }
            action = new Sao.View.Board.Action(attributes, this.context);
            this.actions.push(action);
            container.add(attributes, action);
        },
        reload: function() {
            for (var i = 0; i < this.actions.length; i++) {
                this.actions[i].display();
            }
        }
    });

    Sao.View.Board.Action = Sao.class_(Object, {
        init: function(attributes, context) {
            var model, action_prm, act_window;
            var decoder, search_context, search_value;

            this.name = attributes.name;
            this.context = context || {};

            act_window = new Sao.Model('ir.action.act_window');
            this.action_prm = act_window.execute('get', [this.name],
                    this.context);
            this.action_prm.done(function(action) {
                var i, len;
                var view_ids, decoder, search_context;
                var screen_attributes, action_modes;

                this.action = action;
                this.action.mode = [];
                view_ids = [];
                if ((this.action.views || []).length > 0) {
                    for (i = 0, len = this.action.views.length; i < len; i++) {
                        view_ids.push(this.action.views[i][0]);
                        this.action.mode.push(this.action.views[i][1]);
                    }
                } else if (this.action.view_id !== undefined) {
                    view_ids = [this.action.view_id[0]];
                }

                if ('mode' in attributes) {
                    this.action.mode = attributes.mode;
                }

                if (!('pyson_domain' in this.action)) {
                    this.action.pyson_domain = '[]';
                }

                jQuery.extend(this.context,
                        Sao.Session.current_session.context);
                this.context._user = Sao.Session.current_session.user_id;
                decoder = new Sao.PYSON.Decoder(this.context);
                jQuery.extend(this.context,
                        decoder.decode(this.action.pyson_context || '{}'));
                decoder = new Sao.PYSON.Decoder(this.context);
                jQuery.extend(this.context,
                        decoder.decode(this.action.pyson_context || '{}'));

                this.domain = [];
                this.update_domain([]);

                search_context = jQuery.extend({}, this.context);
                search_context.context = this.context;
                search_context._user = Sao.Session.current_session.user_id;
                decoder = new Sao.PYSON.Decoder(search_context);
                search_value = decoder.decode(
                        this.action.pyson_search_value || '{}');

                screen_attributes = {
                    mode: this.action.mode,
                    context: this.context,
                    view_ids: view_ids,
                    domain: this.domain,
                    search_value: search_value,
                    row_activate: this.row_activate.bind(this),
                };
                this.screen = new Sao.Screen(this.action.res_model,
                        screen_attributes);

                if (attributes.string) {
                    this.title.html(attributes.string);
                } else if (this.action.window_name !== undefined) {
                    this.title.html(this.action.name);
                } else {
                    this.title.html(this.screen.current_view.title);
                }
                this.screen.switch_view().done(function() {
                    this.body.append(this.screen.screen_container.el);
                    this.screen.search_filter();
                }.bind(this));
            }.bind(this));
            this.el = jQuery('<div/>', {
                'class': 'board-action panel panel-default',
            });
            this.title = jQuery('<div/>', {
                'class': 'panel-heading',
            });
            this.el.append(this.title);
            this.body = jQuery('<div/>', {
                'class': 'panel-body',
            });
            this.el.append(this.body);
        },
        row_activate: function() {
            var record_ids, win;

            if (!this.screen.current_record) {
                return;
            }

            if (this.screen.current_view.view_type == 'tree' &&
                    (this.screen.current_view.attributes.keyword_open == 1)) {
                record_ids = this.screen.current_view.selected_records().map(
                        function(record) { return record.id; });
                Sao.Action.exec_keyword('tree_open', {
                    model: this.screen.model_name,
                    id: this.screen.current_record.id,
                    ids: record_ids
                }, jQuery.extend({}, this.context), false);
            } else {
                win = new Sao.Window.Form(this.screen, function(result) {
                    if (result) {
                        this.screen.current_record.save();
                    } else {
                        this.screen.current_record.cancel();
                    }
                }.bind(this));
            }
        },
        set_value: function() {
        },
        display: function() {
            this.screen.search_filter(this.screen.screen_container.get_text());
        },
        get_active: function() {
            if (this.screen && this.screen.current_record) {
                return Sao.common.EvalEnvironment(this.screen.current_record);
            }
        },
        update_domain: function(actions) {
            var i, len;
            var active, domain_ctx, decoder, new_domain;

            domain_ctx = jQuery.extend({}, this.context);
            domain_ctx.context = domain_ctx;
            domain_ctx._user = Sao.Session.current_session.user_id;
            for (i = 0, len = actions.length; i < len; i++) {
                active = actions[i].get_active();
                if (active) {
                    domain_ctx[actions[i].name] = active;
                }
            }
            decoder = new Sao.PYSON.Decoder(domain_ctx);
            new_domain = decoder.decode(this.action.pyson_domain);
            if (Sao.common.compare(this.domain, new_domain)) {
                return;
            }
            this.domain.splice(0, this.domain.length);
            jQuery.extend(this.domain, new_domain);
            if (this.screen) {
                this.display();
            }
        }
    });
}());

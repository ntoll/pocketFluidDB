/*
 * PocketFluidDB - A rather small FluidApp
 *
 * (c) 2009 Nicholas H.Tollervey (http://ntoll.org/contact)
 *
 * Based upon the Sammy javascript framework: http://code.quirkey.com/sammy/
 *
 * and
 *
 * jsFluidDB: http://github.com/ecarnevale/jsFluidDB
 */
(function($) {

    var COOKIE_AUTH_TOKEN = 'pocket_fluiddb_auth';
    var COOKIE_USERNAME = 'pocket_fluiddb_username';
    var COOKIE_OPTIONS = { path: '/', expires: 10};

    var app = $.sammy(function() {
        this.use(Sammy.Template);

        // Always called before handling post/get etc... Like Django middleware
        this.before(function() {
            // sort out the cookie
            var auth = $.cookie(COOKIE_AUTH_TOKEN);
            var username = $.cookie(COOKIE_USERNAME);
            var context = this;
            context.auth = auth;
            context.username = username
        });

        /**********************************************************************
         *
         * UI Helper functions
         *
         *********************************************************************/

        /*
         * Given the result of a GET against a namespace, this function displays
         * any child namespaces and tags.
         *
         * path: the path of the namespace that is currently being displayed
         * data: the results from FluidDB containing the contents of the
         * namespace
         * context: the Sammy context
         */
        function update_tags(path, data, context){
            var obj = JSON.parse(data); 
            // empty the helpful text message element
            $('#tag_content').empty();
            // Populate some of the items
            $('textarea#namespace_description_textarea').val(obj.description);
            $('#namespace_description').html(obj.description);
            $('#path').html(path);
            $('#namespace_path').html(path);
            // cache the two jQuery objects
            $namespace_list = $('#namespace_list');
            $tag_list = $('#tag_list');
            // add namespace
            $.each(obj.namespaceNames, function(n, namespace) {
                var item = { "name": namespace, "path": path};
                context.partial('templates/namespace.template', { item: item}, function(rendered) { $namespace_list.append(rendered)});
            });
             
            // add tags
            $.each(obj.tagNames, function(t, tag) {
                var item = { "name": tag, "path": path};
                context.partial('templates/tag.template', { item: item}, function(rendered) { $tag_list.append(rendered)});
            });
        }

        /*
         * Displays the results of a search of FluidDB
         */
        function search_results(data, context){
            var obj = JSON.parse(data);
            // cache the jQuery object
            var $search_results = $('#search_results');
            // empty the element
            $search_results.empty();
            // add the results
            $search_results.append('<h2>Results</h2><p>Objects with the following ids match your query:</p><ul>');
            if (obj.ids.length>0) {
                $.each(obj.ids, function(o, object_id) {
                    context.partial('templates/result.template', { obj: object_id}, function(rendered) { $search_results.append(rendered)});
                });
            } else {
                $search_results.append('<li>None found. Please try again...</li>');
            }
            $search_results.append('</ul>');
        }

        /**********************************************************************
         *
         * Routes
         *
         *********************************************************************/
        
        /*
         * Logout the user by null-ing the cookies that identify them
         */
        this.post('#/logout', function(context) {
            if(context.auth) {
                $.cookie(COOKIE_AUTH_TOKEN, null, COOKIE_OPTIONS);
                $.cookie(COOKIE_USERNAME, null, COOKIE_OPTIONS);
            }
            context.partial('templates/login.template', null, function(rendered) { $('#login').replaceWith(rendered)});
        });

        /*
         * Login the user by storing away their username and the string used for
         * the basic authorization header into a couple of cookies.
         */
        this.post('#/login', function(context) {
            // extracting the username and password from the form (passed in
            // via the params dictionary).
            var name = context['params']['username'];
            var password = context['params']['password'];
            // Basic validation
            if (name.length > 0 && password.length > 0) {
                var auth = "Basic "+$.base64Encode(name+':'+password);
                $.cookie(COOKIE_AUTH_TOKEN, auth, COOKIE_OPTIONS);
                $.cookie(COOKIE_USERNAME, name, COOKIE_OPTIONS);
                context.log(name);
                context.log(auth);
                // reloading will trigger the re-set of the home-page with data
                // pulled from FluidDB - very hacky... :-/
                location.reload();
            } else {
                // oops...
                alert('You must enter a username and password');
            }
        });

        /*
         * "Homepage" of the application. Sets the starting state according to
         * the context of the request (logged in or not)
         */
        this.get('#/', function(context) {
            if (context.auth) {
                context.partial('templates/logout.template', { username: context.username }, function(rendered) { $('#login').replaceWith(rendered)});
                var path = 'namespaces/'+context.username;
                var url = path+'?returnDescription=True&returnNamespaces=True&returnTags=True';
                fluidDB.get(url, function(data){update_tags(path, data, context)}, true, context.auth);
            } else {
                context.partial('templates/login.template', null, function(rendered) { $('#login').replaceWith(rendered)});
            }
        });

        /*
         * Search FluidDB using the query language described here:
         *
         * http://doc.fluidinfo.com/fluidDB/queries.html
         *
         */
        this.post('#/search', function(context) {
            var search_term = context['params']['search'];
            // Basic validation
            if (search_term.length > 0) {
                try {
                    fluidDB.get('objects?query='+escape(search_term), function(data){search_results(data, context);}, true, context.auth);
                }
                catch (err) {
                    $('#search_results').append('<h3>There was a problem with your search :-(<h3><p>Please try again...</p>');
                }
            } else {
            // oops...
                alert('You must enter something to search for...');
            }
        });
    });

    $(function() {
        app.run('#/');
    });
})(jQuery);

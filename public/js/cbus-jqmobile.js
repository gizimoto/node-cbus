var classon = "item-on";
var classoff = "item-off";

// DIM THE LIGHTS STUFF
var pos, thisid;
var speed = 2.8;
var moved = false;

var $container = $('#content');

$(document).ready(function(){
    // get the devices from the server
    console.log("I am ready");
    
    // popuplate devices list
    $.getJSON('/devices', function( data ) {
        // load all the known devices into the grid
        var allItems = "";
        var newItem = "";
        var name, thischecked, location, group, level;
        for(var i=0;i<data.length;i++) {
            name = data[i].name || "Group "+data[i].group;
            thischecked = (data[i].level > 0) ? 'checked' : '';
            location = data[i].location || 'House';
            group = data[i].group;
            level = data[i].level || 0;
            newItem = 
                  '<li data-filtertext="'+location+'" data-uid="'+group+'" data-label="'+name+'">'
                +   '<span class="ui-li-left">'+name+'</span>'
                +   '<span data-level="'+level+'">'+level+'%</span>'
                +   '<span class="ui-li-aside">'
                +     '<label for="flip-'+group+'" class="ui-hidden-accessible">Toggle</label>'
                +     '<input data-role="flipswitch" name="flip-'+group+'" id="flip-'+group+'" data-mini="true" type="checkbox" '+thischecked+'>'
                +   '</span>'
                + '</li>';
            allItems += newItem;
        }    
        $('#device-list').append( $(allItems) );
        $('#device-list [data-role="flipswitch"]').flipswitch().flipswitch('refresh');
        $('#device-list').listview('refresh');

    });
    
    // apply locally saved location filter
    loc = restoreLocation() || "";
    $('#device-search').val(loc);

    // populate locations list
    $.getJSON('/locations',function( data ) {
        // load all the known devices into the grid
        var allItems = "";
        var newItem = "";
        var locname;
        for(var i=0;i<data.length;i++) {
            locname = data[i];
            if(locname){
                newItem = '<li><a href="#" data-filter="'+locname+'">'+locname+'</a></li>';
                allItems += newItem;
            }
        }
        $('#left-filters').append( $(allItems) );
        $('#left-filters').listview("refresh");
    });

    // attach handler when filter list items (locations) are clicked
    $('#left-filters').on('click','a', filterClick);

    // attach handler for flip switch changes
    $('#device-list').on('change', deviceFlipChange);
    
    // attach handler for list view clicks
    $('#device-list').on('click', deviceClick);

    // attach handler for dialog slider stop events    
    $('#dialog-lighting').on('slidestop', dialogSlideStop);
    $('#dialog-lighting').on('change', dialogSlideChange);
    
    // attach handler for dialog preset buttons
    $('#dialog-lighting-preset').on('click', dialogPresetClick);

});

// EVENT HANDLERS

function sinkEvents(event) {
    event.preventDefault();
}

// filter items when filter link is clicked
function filterClick(event) {
    event.preventDefault();
    var selector = $(this).attr('data-filter');
    if (selector) {
        if (selector == "*") selector = "";
        $('#device-search').val(selector);
        $('#device-list').filterable('refresh');
        $('#left-panel').panel('close');
        $.mobile.silentScroll(0);
        saveLocation(selector);
    }
}

// handle on/off flip switch changes
function deviceFlipChange(event) {
    event.preventDefault();
    var $elem = $(event.target);
    // fetch uid from element or first parent with data-uid
    var uid = ($elem.attr('data-uid') || $elem.parents('[data-uid]:first').attr('data-uid'));
    var level = $elem.prop('checked');
    //var level = event.target.checked;
    adjustLevel(uid, level);
}

// display popup with dimmer options when listview clicked
function deviceClick(event) {
    event.preventDefault();
    var $elem = $(event.target);
    // dont display popup is aside button was clicked
    if (!$elem.parents('span:first').is('.ui-li-aside')) {
        // fetch uid from element or first parent with data-uid
        var uid = ($elem.attr('data-uid') || $elem.parents('[data-uid]:first').attr('data-uid'));
        // get grouping li element
        var $li = ($elem.is('li')) ? $elem : $elem.parents('li:first');
        // get level from child span[data-level] element
        var level = $li.find('[data-level]').attr('data-level');
        
        var $popup = $('#dialog-lighting');
        $popup.attr('data-uid', uid);
        $('#dialog-lighting-header').text($li.attr('data-label'));
        $('#dialog-lighting-slider')
            //.off('slidestop')
            .on('slidestop', sinkEvents)
            .prop('value', level)
            .slider('refresh')
            //.on('slidestop', dialogSlideStop);
            .off('slidestop');
        $('#dialog-lighting').popup('open');
    }
}

// handle dialog slider stop events
function dialogSlideStop(event) {
    event.preventDefault();
    var uid = $(event.target).parents('[data-uid]').attr('data-uid');
    var level = event.target.value;
    adjustLevel(uid, level);
}

function dialogSlideChange(event) {
    // do nothing for now
    // TODO: implement timer to fire of level adjustments during the slide
}

function dialogPresetClick(event) {
    event.preventDefault();
    $target = $(event.target);
    uid = $target.parents('[data-uid]').attr('data-uid');
    level = $target.attr('data-preset');
    adjustLevel(uid, level);
    $('#dialog-lighting-preset ui-btn-active').removeClass('ui-btn-active');
    return false;
}

// HTML5 LOCAL STORAGE/SESSION STUFF

function saveLocation(loc) {
    if (typeof(Storage) !== "undefined") {
        localStorage.setItem("location", loc);
    }
}

function restoreLocation() {
    if (typeof(Storage) !== "undefined") {
        return localStorage.getItem("location");
    }
}


// REALTIME SOCKET STUFF

var socket = io.connect();

socket.on('connect', function (data) {
    console.log('connected to socket.io');
});

socket.on('statusStream', function (data) {
    //console.log(data);
    console.log('Incomming status uid='+data.group+' level='+data.level);
    if (data.type == 'update_status') {
        // update device list
        var $li = $('[data-uid="'+data.group+'"]');
        var $flip = $li.find('[data-role="flipswitch"]');
        flipchecked = (data.level == 0) ? false : true;
        $('#device-list').off('change');
        $flip.prop('checked', flipchecked).flipswitch('refresh');
        $('#device-list').on('change', deviceFlipChange);
        $li.find('[data-level]').attr('data-level', data.level).text(data.level+'%');
        
        // update popup if showing this device
        $popup = $('#dialog-lighting');
        if ($popup.attr('data-uid') == data.group) {
            //?? TODO check if popup visible also ('ui-popup-hidden' class) ??
            $('#dialog-lighting').off('change');
            $('#dialog-lighting-slider').prop('value', data.level).slider('refresh');
            $('#dialog-lighting').on('change', dialogSlideChange);
        }
    }
});

// if no dimlevel is specified, the light will toggle on/off
function adjustLevel(id, dimlevel) {
    apitimeout = 0;
    apidelay = 0;
    if (dimlevel === false) {
        apilevel = 0;
        turnme = "off";
    }
    else if (dimlevel === true) {
        apilevel = 100;
        turnme = "on";
    } 
    else {
        dimlevel = (dimlevel > 100) ? 100 : dimlevel;
        dimlevel = (dimlevel < 0) ? 0 : dimlevel;
        apilevel = dimlevel;
        turnme = "dim to "+dimlevel;
    }
    console.log("Turning "+id+" "+turnme);
    $.getJSON('/cmd?device='+id+'&level='+apilevel+'&timeout='+apitimeout+'&delay='+apidelay);
};



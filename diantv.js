Speaks = new Meteor.Collection('speaks');
var Slide = {
    screenHeight: - 1,
    screenWidth: - 1,
    hallEl: null,
    itemMatrix: [],
    nextItemIndex: 0,
    initialize: function() {
        this.screenHeight = $(window).height();
        this.screenWidth = $(window).width();
        this.hallEl = $('.hall');
    },
    lastOffset: function() {
        var $lastSpeak = $('.speak:last-child');
        if ($lastSpeak.length === 0) {
            return {
                bottom: 0,
                right: 0
            };
        }
        return {
            bottom: $lastSpeak.offset().top + $lastSpeak.height(),
            right: $lastSpeak.offset().left + $lastSpeak.width()
        };
    },
    styleMap: {
        'brick-huge': {
            height: 2,
            width: 4
        },
        'brick-normal': {
            height: 2,
            width: 2
        },
        'brick-tiny': {
            height: 2,
            width: 1
        }
    },
    getBrick: function() {
        console.log('[getBricks]', arguments);
        var item = Speaks.find({},
        {
            sort: {
                elapsedTime: 1
            },
            limit: 1,
            skip: (this.nextItemIndex)
        }).fetch();
        this.nextItemIndex++;
        this.nextItemIndex %= (Speaks.find().count() || 1);

        return {
            frame: Meteor.ui.render(function() {
                return Template.speakhall({
                    speaks: item
                });
            }),
            html: Template.speakhall({
                speaks: item
            }),
            style: this.styleMap[item[0].style]
        };

    },
    getLine: function() {
        var width = 0;
        var lineHtml = '';
        while (width < 4) {
            var height = 0;
            var lastWidth = 0;
            var tmpHtml = '';
            while (height < 2) {
                var brick = this.getBrick();
                height += brick.style.height;
                tmpHtml += brick.html;
                lastWidth = brick.style.width;
            }
            if(width + lastWidth > 4){
                // fallback
                var count = Speaks.find().count();
                this.nextItemIndex += count - 1;
                this.nextItemIndex %= (count || 1);
                break;
            }
            width += lastWidth;
            lineHtml += tmpHtml;
        }
        //console.log(lineHtml);
        var lineEl = $(lineHtml);
        return lineEl;
    },
    renderLine: function() {
        var lineEl = this.getLine();
        lineEl.appendTo(this.hallEl);
        this.itemMatrix.push(lineEl);
    },
    removeFirstLine: function(){
        //animation
        var firstLineEl = this.itemMatrix[0];
        this.hallEl.addClass('up');
        //firstLineEl.each(function(index, item){
            //debugger;
            //$(item).addClass('up');
        //});
        setTimeout($.proxy(function(){
            this.itemMatrix[0].remove();
            this.hallEl.removeClass('up');
            this.itemMatrix.splice(0, 1);
        }, this), 1000);
    },
    scroll: function() {
        //Tip: control item by row
        //append item
        if (this.itemMatrix.length < 3) {
            while (this.itemMatrix.length < 3) {
                this.renderLine();
            }
            return;
        }
        this.renderLine();
        this.removeFirstLine();
    },
    clear: function() {
        $.each(this.itemMatrix, function(index, item) {
            item.remove();
        });
    }
};

if (Meteor.is_client) {
    var $name = null;

    Meteor.startup(function() {
        console.log('ok?');
        $name = $('.name');
        $content = $('.content');
        if (window.location.hash === "#tv") {
            $('.post-dialog').addClass('fn-hide');
            var elem = document.documentElement;
            var requestFullScreen = elem.requestFullScreen || 
                elem.webkitRequestFullScreen ||
                elem.mozRequestFullScreen;
            var req = requestFullScreen.name;

            elem.onclick = function(){
                this[req]();
            };
            //can't autofullscreen, only click, iframe, key 
            //can trigger this event
        }
        Slide.initialize();

        var timer = setInterval(function() {
            console.log('time kick');
            Slide.scroll();
            console.log('status', Meteor.status());
        },
        3 * 1000);
        close = function() {
            clearInterval(timer);
        };
    });

    Template.input.events = {
        'click input[type="text"]': function() {},
        'click input[type="button"]': function() {
            if ($content.val().trim() === '') {
                return;
            }
            var date = new Date();
            var timeStr =
            /*date.getFullYear() + '年' +*/
            (date.getMonth() + 1) + '月' + date.getDate() + '日 ' + (date.getHours() / 100).toString().substr( - 2) + ':' + (date.getMinutes() / 100).toString().substr( - 2);
            var contentStr = $content.val();
            var styleStr = contentStr.length < 16 ? 'brick-tiny': 'brick-normal';
            console.log($content.val());
            Speaks.insert({
                name: $name.val() || '无名氏',
                content: $content.val(),
                time: timeStr,
                elapsedTime: Date.now(),
                style: styleStr
            });
            $content.val(null);
        }
    };
}

if (Meteor.is_server) {
    Meteor.startup(function() {
        // code to run on server at startup
        if (Speaks.find().count() === 0) {
            Speaks.remove({});
            Speaks.insert({
                name: 'Houks',
                content: 'test!',
                time: 'From 192.168.7.1',
                elapsedTime: Date.now(),
                style: 'brick-huge'
            });
        }
    });
}


//TODO: headline
//TODO: make it easily to amdin
//TODO: shielded the db operate at client
Notice = new Meteor.Collection('notice');
var Notification = {
    nextItemIndex: 0,
    noticeEl: null,
    alertContent: '',
    initialize: function() {
        this.noticeEl = $('.notice');
    },

    getNotice: function() {
        var notice = Notice.find({},
        {
            sort: {
                elapsedTime: 1
            },
            skip: this.nextItemIndex,
            limit: 1
        }).fetch();
        this.nextItemIndex++;
        this.nextItemIndex %= Notice.find().count();
        return Template.notice({
            'content': notice[0].content,
            'alert': this.alertContent
        });
    },
    renderNotice: function() {
        var noticeContentEl = this.getNotice();
        //noticeContentEl = $(noticeContentEl);
        this.noticeEl.html(noticeContentEl);
    },
    showNotice: function() {
        this.noticeEl.removeClass('hide');
    },
    hideNotice: function() {
        this.noticeEl.addClass('hide');
    },
    alertOn: function(msg) {
        this.alertContent = msg;
    },
    alertOff: function() {
        this.alertContent = '';
    },
    changeNotice: function() {
        this.hideNotice();
        setTimeout($.proxy(function() {
            this.renderNotice();
            this.showNotice();
        },
        this), 1000);
    }
};

Speaks = new Meteor.Collection('speaks');
var Slide = {
    parentHeight: - 1,
    parentWidth: - 1,
    hallEl: null,
    itemMatrix: [],
    nextItemIndex: 0,
    initialize: function() {
        this.hallEl = $('.hall');
        this.parentHeight = this.hallEl.parent().height();
        this.parentWidth = this.hallEl.parent().width();
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
    isLastLine: false,
    getBrick: function() {
        var item = Speaks.find({},
        {
            sort: {
                elapsedTime: 1
            },
            limit: 1,
            skip: (this.nextItemIndex)
        }).fetch();

        // step in the pos of brick
        this.nextItemIndex++;
        // judege if it is the last brick
        if (this.nextItemIndex === Speaks.find().count()) {
            this.nextItemIndex %= (Speaks.find().count() || 1);
            this.isLastLine = true;
        } else {
            this.isLastLine = false;
        }

        console.log('[getBricks]', this.nextItemIndex, item.content, this.isLastLine);
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
                // get brick here
                var brick = this.getBrick();
                height += brick.style.height;
                tmpHtml += brick.html;
                lastWidth = brick.style.width;
            }
            if (width + lastWidth > 4) {
                // if width cross border, fallback
                var count = Speaks.find().count();
                this.nextItemIndex += count - 1;
                this.nextItemIndex %= (count || 1);
                break;
            }
            width += lastWidth;
            lineHtml += tmpHtml;

            if (this.isLastLine) {
                break;
            }
        }
        //console.log(lineHtml);
        var lineEl = $(lineHtml);
        return lineEl;
    },
    renderLine: function() {
        var lineEl = this.getLine();
        if (this.isLastLine) {
            lineEl = lineEl.add(
            $('<span>').addClass('divide').append(
            $('<span>').addClass('divide-text').text('分界线')));
        }
        lineEl.appendTo(this.hallEl);
        this.itemMatrix.push(lineEl);
    },
    removeFirstLine: function() {
        //animation
        var firstLineEl = this.itemMatrix[0];
        this.hallEl.addClass('up');
        //firstLineEl.each(function(index, item){
        //debugger;
        //$(item).addClass('up');
        //});
        setTimeout($.proxy(function() {
            this.itemMatrix[0].remove();
            this.hallEl.removeClass('up');
            this.itemMatrix.splice(0, 1);
        },
        this), 1000);
    },
    scroll: function() {
        //Tip: control item by row
        //append item
        if (this.itemMatrix.length < 4) {
            while (this.itemMatrix.length < 4) {
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

var router = function() {
    if (window.location.hash === "#tv") {
        $('.post-dialog').addClass('fn-hide');
        var elem = document.documentElement;
        var requestFullScreen = elem.requestFullScreen || elem.webkitRequestFullScreen || elem.mozRequestFullScreen;
        var req = requestFullScreen.name;

        elem.onclick = function() {
            this[req]();
        };
        //can't autofullscreen, only click, iframe, key 
        //can trigger this event
    }
};

if (Meteor.is_client) {
    var $name = null;

    Meteor.startup(function() {
        var notiShowCnt = 0;

        console.log('ok?');
        $name = $('.name');
        $content = $('.content');

        router();

        Slide.initialize();
        Notification.initialize();

        var timer = setInterval(function() {
            console.log('time kick');
            Slide.scroll();
            ((notiShowCnt++) % 3) || Notification.changeNotice();

            if(Meteor.status().connected){
                Notification.alertOff();
            }else{
                Notification.alertOn('服务器断开');
            }
        },
        3 * 1000);
        
        // debuger
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
            (date.getMonth() + 1) + '月' + date.getDate() + '日 ' + (date.getHours() / 100).toFixed(2).substr( - 2) + ':' + (date.getMinutes() / 100).toFixed(2).substr( - 2);
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


(function ($) {
    function wysiwyg(context) {
        var config = {
            toolbar:
            [
                ['Sourcedialog', 'Bold', 'Italic', 'Underline', 'Link', 'Unlink', 'PasteFromWord'],
            ],
            height: '96px'
        };

        context.find('.wysiwyg').each(function () {
            if ($(this).is('.caption')) {
                editor = CKEDITOR.inline(this, config)
            } else {
                editor = CKEDITOR.inline(this);
            }
            $(this).data('ckeditorInstance', editor);
        })
    }

    function loadJStree(index) {

        // RemoveNode Plugin for jsTree
        $.jstree.plugins.removenode = function(options, parent) {
            var removeIcon = $('<i>', {
                class: 'jstree-icon jstree-removenode-remove',
                attr:{role:'presentation'}
            });
            var undoIcon = $('<i>', {
                class: 'jstree-icon jstree-removenode-undo',
                attr:{role:'presentation'}
            });
            this.bind = function() {
                parent.bind.call(this);
                this.element.on(
                    'click.jstree',
                    '.jstree-removenode-remove, .jstree-removenode-undo',
                    $.proxy(function(e) {
                        var icon = $(e.currentTarget);
                        var node = icon.closest('.jstree-node');
                        var nodeObj = this.get_node(node);
                        icon.hide();
                        if (icon.hasClass('jstree-removenode-remove')) {
                            // Handle node removal.
                            icon.siblings('.jstree-removenode-undo').show();
                            node.addClass('jstree-removenode-removed');
                            nodeObj.data.remove = true;
                        } else {
                            // Handle undo node removal.
                            icon.siblings('.jstree-removenode-remove').show();
                            node.removeClass('jstree-removenode-removed');
                            nodeObj.data.remove = false;
                        }
                    }, this)
                );
            };
            this.redraw_node = function(node, deep, is_callback, force_render) {
                node = parent.redraw_node.apply(this, arguments);
                if (node) {
                    // Add remove/undo icons to every node.
                    var nodeJq = $(node);
                    var anchor = nodeJq.children('.jstree-anchor');
                    var removeIconClone = removeIcon.clone();
                    var undoIconClone = undoIcon.clone();
                    anchor.append(removeIconClone);
                    anchor.append(undoIconClone);

                    // Carry over the removed/not-removed state
                    var data = this.get_node(node).data;
                    if (data.remove === 'undefined' || data.remove) {
                        removeIconClone.hide();
                        nodeJq.addClass('jstree-removenode-removed');
                    } else {
                        undoIconClone.hide();
                        nodeJq.removeClass('jstree-removenode-removed');
                    }
                }
                return node;
            };
        };

        // Display Plugin for jsTree
        $.jstree.plugins.display = function(options, parent) {
            var displayIcon = $('<i>', {
                class: 'jstree-icon jstree-displaylink',
                attr:{role: 'presentation'}
            });
            this.bind = function() {
                parent.bind.call(this);
                this.element.on(
                    'click.jstree',
                    '.jstree-displaylink',
                    $.proxy(function(e) {
                        var icon = $(e.currentTarget);
                        var node = icon.closest('.jstree-node');
                        var nodeObj = this.get_node(node);
                        var nodeUrl = nodeObj.data.url;
                        window.open(nodeUrl, '_blank');
                    }, this)
                );
            };
            this.redraw_node = function(node, deep, is_callback, force_render) {
                node = parent.redraw_node.apply(this, arguments);
                if (node) {
                    var nodeObj = this.get_node(node);
                    var nodeUrl = nodeObj.data.url;
                    if (nodeUrl) {
                        var nodeJq = $(node);
                        var anchor = nodeJq.children('.jstree-anchor');
                        anchor.append(displayIcon.clone());
                    }
                }
                return node;
            };
        };
        
        //Initialize unique jsTree for each block
        var navTree = $("[name='o:block[" + index + "][o:layout]']").siblings('.block-pagelist-tree');
        var initialTreeData;
        navTree.jstree({
            'core': {
                "check_callback" : function (operation, node, parent, position, more) {
                    if(operation === "copy_node" || operation === "move_node") {
                        if(more.is_multi) {
                            return false; // prevent moving node to different tree
                        }
                    }
                    return true; // allow everything else
                },
                'data': navTree.data('jstree-data'),
            },
            'plugins': ['dnd', 'removenode', 'display']
        }).on('loaded.jstree', function() {
            // Open all nodes by default.
            navTree.jstree(true).open_all();
            initialTreeData = JSON.stringify(navTree.jstree(true).get_json());
        }).on('move_node.jstree', function(e, data) {
            // Open node after moving it.
            var parent = navTree.jstree(true).get_node(data.parent);
            navTree.jstree(true).open_all(parent);
        });

        $('#site-form').on('o:before-form-unload', function () {
            if (initialTreeData !== JSON.stringify(navTree.jstree(true).get_json())) {
                Omeka.markDirty(this);
            }
        });
    }

    /**
     * Open the attachment options sidebar.
     *
     * @param int itemId The attached item ID, if any
     * @param int mediaId The attached media ID, if any
     * @param str caption The attachment caption, if any
     */
    function openAttachmentOptions(itemId, mediaId, caption)
    {
        var attachmentItem = $('#attachment-item');

        // Explicitly reset selected item (setting an undefined "new" item ID will actually leave
        // the old value unchanged).
        attachmentItem.removeData('itemId');
        attachmentItem.data('itemId', itemId);
        return $.post(
            $('#attachment-options').data('url'),
            {itemId: itemId, mediaId: mediaId}
        ).done(function(data) {
            attachmentItem.html(data);
            $('#attachment-caption .caption').val(caption);
            var sidebar = $('#attachment-options');
            Omeka.populateSidebarContent(sidebar, $(this).data('sidebar-content-url'));
            Omeka.openSidebar(sidebar);
            sidebar.scrollTop(0);
        });
    }

    /**
     * Set the selecting attachment.
     *
     * @param object attachment The selecting attachment element
     */
    function setSelectingAttachment(attachment)
    {
        $('.selecting-attachment').removeClass('selecting-attachment');
        attachment.addClass('selecting-attachment');
    }

    function replaceIndex(context, find, index) {
        context.find(':input').each(function() {
            var thisInput = $(this);
            if ($(this).attr('name') == undefined) {
                return;
            }
            var name = thisInput.attr('name').replace('[__' + find + '__]', '[' + index + ']');
            var label = thisInput.parents('.field').find('label').first();
            thisInput.attr('name', name);
            if (!thisInput.is(':hidden')) {
                thisInput.attr('id', name);
            }
            label.attr('for', name);
        });
        context.find('.attachments').each(function () {
            var thisAttachments = $(this);
            var template = thisAttachments.data('template').replace(new RegExp('\\[__' + find + '__\\]', 'g'), '[' + index + ']');
            thisAttachments.data('template', template);
        });
    }

    /**
     * Add an item attachment.
     *
     * Typically used when skipping attachment options.
     *
     * @param object selectingAttachment Add the item to this attachment
     * @param object itemData The data of the item to add
     */
    function addItemAttachment(selectingAttachment, itemData)
    {
        var attachment = $(selectingAttachment.parents('.attachments').data('template'));

        var title = itemData.display_title;
        var thumbnailUrl = itemData.thumbnail_url;
        var thumbnail;
        if (thumbnailUrl) {
            thumbnail = $('<img>', {src: thumbnailUrl});
        }
        attachment.find('input.item').val(itemData.value_resource_id);
        attachment.find('.item-title').empty().append(thumbnail).append(title);
        selectingAttachment.before(attachment);

        if (selectingAttachment.closest('.attachments-form').hasClass('attachments-item-only')) {
            attachment.find('.attachment-options-icon').closest('li').remove();
        }
    }

    $(document).ready(function () {
        var list = document.getElementById('blocks');
        var blockIndex = 0;
        var jstreeIndex = 1;
        
        new Sortable(list, {
            draggable: ".block",
            handle: ".sortable-handle",
            onStart: function (e) {
                var editor = $(e.item).find('.wysiwyg').ckeditor().editor;
                if (editor) {
                    editor.destroy();
                }
            },
            onEnd: function (e) {
                wysiwyg($(e.item));
            },
        });

        $('#new-block button').click(function() {
            $.post(
                $(this).parents('#new-block').data('url'),
                {layout: $(this).val()}
            ).done(function(data) {
                var newBlock = $(data).appendTo('#blocks');
                newBlock.trigger('o:block-added');
                Omeka.scrollTo(newBlock);
            });
        });

        $('#blocks .block').each(function () {
            $(this).data('blockIndex', blockIndex);
            replaceIndex($(this), 'blockIndex', blockIndex);
            loadJStree(blockIndex);
            blockIndex++;
        });

        $('#blocks').on('o:block-added', '.block', function () {
            $(this).data('blockIndex', blockIndex);
            replaceIndex($(this), 'blockIndex', blockIndex);
            wysiwyg($(this));
            loadJStree(blockIndex);
            blockIndex++;
        });
        wysiwyg($('body'));

        $('#blocks').on('click', 'a.remove-value, a.restore-value', function (e) {
            e.preventDefault();
            var block = $(this).parents('.block');
            block.toggleClass('delete');
            block.find('a.remove-value, a.restore-value').show();
            $(this).hide();
            Omeka.markDirty($(this).closest('form'));
        });
        
        $('form').submit(function(e) {
            $('#blocks .block').each(function(blockIndex) {
                var thisBlock = $(this);
                if (thisBlock.hasClass('delete')) {
                    thisBlock.find(':input').prop('disabled', true);
                } else if (thisBlock.attr('data-block-layout') === 'listOfPages') {
                    // Update listOfPages jstree object
                    // Increment if multiple
                    var jstree = thisBlock.find('.jstree-' + jstreeIndex).jstree()
                    thisBlock.find('.jstree-' + jstreeIndex + ' .jstree-node').each(function(index, element) {
                        //Remove deleted nodes and any children
                        if (element.classList.contains('jstree-removenode-removed')) {
                            jstree.delete_node(element.children);
                        }; 
                        if (jstree.get_node(element)) {
                            var nodeObj = jstree.get_node(element);
                            var element = $(element);
                            nodeObj.data['data'][element.data('name')] = element.val()
                        };
                    });
                    thisBlock.find('.jstree-' + jstreeIndex).siblings('.inputs').find(':input[type=hidden]').val(JSON.stringify(jstree.get_json()));
                    jstreeIndex++;
                } else {
                    thisBlock.find('.attachments .attachment').each(function(attachmentIndex) {
                        var thisAttachment = $(this);
                        replaceIndex(thisAttachment, 'attachmentIndex', attachmentIndex);
                    });
                }
            });
        });

        // Toggle attachment status
        $('#blocks').on('click', '.delete,.undo', function(e) {
            e.preventDefault();
            var attachment = $(this).parents('.attachment');
            attachment.toggleClass('delete');
            if (attachment.hasClass('delete')) {
                attachment.find('input[type="hidden"]').each(function() {
                    $(this).attr('disabled', 'disabled');
                });
            } else {
                attachment.find('input[type="hidden"]').each(function() {
                    $(this).removeAttr('disabled');
                });
            }
        });

        // Make attachments sortable.
        $('#blocks').on('o:block-added', '.block', function () {
            $(this).find('.attachments').each(function () {
                new Sortable(this, {
                    draggable: ".attachment",
                    handle: ".sortable-handle"
                });
            });
        });
        $('.attachments').each(function() {
            new Sortable(this, {
                draggable: ".attachment",
                handle: ".sortable-handle"
            });
        });

        // Append attachment.
        $('#blocks').on('click', '.attachment-add', function(e) {
            setSelectingAttachment($(this));
            openAttachmentOptions().done(function () {
                $('#attachment-item-select').click();
            });
        });

        // Open attachment options sidebar after selecting attachment.
        $('body').on('click', '.attachment-options-icon', function(e) {
            e.preventDefault();
            var attachment = $(this).closest('.attachment');
            setSelectingAttachment(attachment);
            openAttachmentOptions(
                attachment.find('input.item').val(),
                attachment.find('input.media').val(),
                attachment.find('input.caption').val()
            );
        });

        // Enable item selection for attachments.
        $('#content').on('click', '#attachment-item-select', function(e) {
            e.preventDefault();
            var sidebar = $('#select-resource');
            var sidebarContentUrl = $(this).data('sidebar-content-url')
            var attachmentsForm = $('.selecting-attachment').closest('.attachments-form');
            if (attachmentsForm.data('itemQuery')) {
                sidebarContentUrl = sidebarContentUrl + '?' + $.param(attachmentsForm.data('itemQuery'))
            }
            Omeka.populateSidebarContent(sidebar, sidebarContentUrl);
            Omeka.openSidebar(sidebar);
        });

        // Update attachment options sidebar after selecting item.
        $('#select-resource').on('o:resource-selected', '.select-resource', function(e) {
            var thisSelectResource = $(this);
            var resource = thisSelectResource.closest('.resource').data('resource-values');
            var selectingAttachment = $('.selecting-attachment');

            if (selectingAttachment.closest('.attachments-form').hasClass('attachments-item-only')) {
                // This is an item-only attachment form.
                Omeka.closeSidebar($('#attachment-options'));
                addItemAttachment(selectingAttachment, resource);
            } else {
                // This is a normal attachment form.
                openAttachmentOptions(resource.value_resource_id);
                $('#select-resource').removeClass('active');
            }
        });

        // Add multiple item attachments.
        $('#select-resource').on('o:resources-selected', '.select-resources-button', function(e) {
            Omeka.closeSidebar($('#attachment-options'));
            var selectingAttachment = $('.selecting-attachment');
            $('#item-results').find('.resource')
                .has('input.select-resource-checkbox:checked').each(function() {
                    addItemAttachment(selectingAttachment, $(this).data('resource-values'));
                });
        });

        // Change attached media.
        $('#attachment-item').on('click', 'li.media', function(e) {
            var media = $(this);
            var attachmentItem = $('#attachment-item');

            attachmentItem.find('li.media').removeClass('attached');
            media.addClass('attached');
            attachmentItem.find('img.item-thumbnail').attr('src', media.find('img.media-thumbnail').attr('src'));
            attachmentItem.find('span.media-title').text(media.find('img.media-thumbnail').attr('title'));
        });

        // Apply changes to the attachments form.
        $('#attachment-confirm-panel button').on('click', function(e) {
            e.preventDefault();
            $('#attachment-options').removeClass('active');
            var item = $('#attachment-item');
            var caption = $('#attachment-caption .caption').val();
            var attachment = $('.selecting-attachment');
            if (attachment.hasClass('attachment-add')) {
                var attachments = attachment.parents('.attachments');
                attachment = $(attachments.data('template'));
                $('.selecting-attachment').before(attachment);
            }

            // Set hidden data.
            attachment.find('input.item').val(item.data('itemId'));
            attachment.find('input.media').val(item.find('li.media.attached').data('mediaId'));
            attachment.find('input.caption').val(caption);

            // Set visual elements.
            var title = item.find('.item-title').html();
            if (title) {
                var thumbnail;
                var thumbnailUrl = item.find('.item-thumbnail').attr('src');
                if (thumbnailUrl) {
                    thumbnail = $('<img>', {src: thumbnailUrl});
                }
                attachment.find('.item-title').empty().append(thumbnail).append(title);
            }
        });
    });
})(window.jQuery);

var BOMmultiplier = 1;

$(document).ready(function() {
    //input the optimal quantity for each part and color input field accordingly
    $('input[type="number"]:not(#multiplier)').each(function() {
        $(this).val(OptimalQty($(this).attr('id')).qty); 

        var parsedAddr = $(this).attr('id').split('-');
        var availability = mouserObj[parsedAddr[1]].SearchResults.Parts[parsedAddr[2]].Availability;
        if (availability.search("Auf Lager") >= 0) {//if ' Auf Lager' 
            availability = parseInt(availability);
            if (availability < $(this).val()) { //if less parts available than required
                $(this).addClass('bg-danger');
            }
            if (availability >= $(this).val()) {//if more parts available than required
                $(this).addClass('bg-success');
            }
        }
        else {//if no parts available
            $(this).addClass('bg-warning');
        }
    });
    //calculate the total price based on part's optimal quantity
    $('.total€').each(function() {
        $(this).html(OptimalQty($(this).attr('id')).price + ' €'); 
    });
    
    updatePriceBreaks();
    hoverPriceBreaks();
    selectBestPart();
});

function updatePriceBreaks()  {
    $('.prbr').each(function() {
        var parsedAddr = $(this).attr('id').split('-');
        var reqQty = BOMObj[parsedAddr[1]].quantity* BOMmultiplier;
        var priceBreaksArr = mouserObj[parsedAddr[1]].SearchResults.Parts[parsedAddr[2]].PriceBreaks;
        var relI = 0;
        for (var i = 1, n = priceBreaksArr.length; i< n; i++) {
            if (priceBreaksArr[i].Quantity > reqQty) {
                relI = i - 1;
                break;
            }
        }
        //console.log(priceBreaksArr);
        var prBreaksList = '';
        for (var i = relI, n = Math.min(priceBreaksArr.length, relI+3); i < n; i++) {
            prBreaksList += `<li>${priceBreaksArr[i].Quantity}: ${priceBreaksArr[i].Price}</li>`;
        }
        $(this).html(`<ul><small>${prBreaksList}</small></ul>`);
    });
}
function hoverPriceBreaks() {
    $('.prbr').each(function() {
        var parsedAddr = $(this).attr('id').split('-');
        var priceBreaksArr = mouserObj[parsedAddr[1]].SearchResults.Parts[parsedAddr[2]].PriceBreaks;
        var allPrBr = '<ul>';
        priceBreaksArr.forEach(function(element) {
            allPrBr += `<li>${element.Quantity}: ${element.Price}</li>`;
        });
        allPrBr += '</ul>';
        $(this).tooltip({ title: allPrBr, html: true}, {trigger: 'manual'});
    });
}

//calculate price-optimal quantity of the part taking into consideration price breaks
//address is XXX-column-resultidx
function OptimalQty (address) {
    var price = 0;
    var parsedAddr = address.split('-');
    var reqQty = BOMObj[parsedAddr[1]].quantity * BOMmultiplier;
    var priceBreaksArr = mouserObj[parsedAddr[1]].SearchResults.Parts[parsedAddr[2]].PriceBreaks;

    var qty;
    priceBreaksArr.forEach(function (element) {
        var parsedPrice = parseFloat(element.Price.replace(",", "."));
        if (reqQty > element.Quantity) {
            price = reqQty * parsedPrice;
            qty = reqQty;
        }
        else {
            if (parsedPrice * element.Quantity < price) {
                price = parsedPrice * element.Quantity;
                qty = element.Quantity;
            }
        }
    });
    if (qty == undefined) {
        qty = priceBreaksArr[0].Quantity;
        price = qty * parseFloat(priceBreaksArr[0].Price.replace(",", "."));
    }    
    return {"qty": qty, "price": price.toFixed(2)};
}
//calculate the price based on the quantity and correct price break
function calcPrice(qty, priceBreaksArr) {
    var price=0;
    priceBreaksArr.forEach(function (element) {
        if (qty < element.Quantity) {
            return price + ' €';
        }
        price = qty * parseFloat(element.Price.replace(",", "."));
    });
    return price.toFixed(2) + ' €';
}

// recalculate the total price of column specified by parsedAddr.
function updateRowTotal(qty, parsedAddr) {
    var totalId = `total-${parsedAddr[1]}-${parsedAddr[2]}`;
    $('#'+totalId).html(calcPrice(qty, mouserObj[parsedAddr[1]].SearchResults.Parts[parsedAddr[2]].PriceBreaks));
}

//update price on qty change and color input field accordingly
$('input[type="number"]:not(#multiplier)').on("change paste keyup", function() {
    var parsedAddr = $(this).attr('id').split('-');
    
    updateRowTotal($(this).val(), parsedAddr);

    var mouserPart = mouserObj[parsedAddr[1]].SearchResults.Parts[parsedAddr[2]];
    var availability = mouserPart.Availability;
    var reqQty = BOMObj[parsedAddr[1]].quantity * BOMmultiplier;
    if (availability.search("Auf Lager") >= 0) {//if ' Auf Lager' 
        availability = parseInt(availability);
        if (availability < $(this).val() || $(this).val() < reqQty ) { //if less parts available than required
            $(this).removeClass();
            $(this).addClass('bg-danger');
        }
        else {//if more parts available than required
            $(this).removeClass();
            $(this).addClass('bg-success');
        }
    }
    else {//if no parts available
        $(this).removeClass();
        $(this).addClass('bg-warning');
    }
 });

function cartDone(data) {
    console.log(data); 
    $('#order-results').append(`<tr><th>CartKey:</th><th>${data.CartKey}</th>
        <th>Total Item Count:</th><th>${data.TotalItemCount}</th><th></th>
        <th>Total Items Merchandise:</th><th>$ ${data.MerchandiseTotal}</th></tr>`);

    data.CartItems.forEach(function(element) {
        $('#nr-'+escapeCSSNot(element.MouserPartNumber)).html(`${element.Quantity} part(s) ordered at $ ${element.ExtendedPrice}`);
    });
}
//escape characters used in CSS notation by placing two backslashes in front of them
function escapeCSSNot(MouserPartNr) {
    return MouserPartNr.replace( /(:|#|\.|\[|\]|,|=|@)/g, "\\$1" );
}


//multiply Required Quantity column by this value
$('#multiplier').on("change paste keyup", function() {
    var reqQtys = $('.reqqty');
    BOMmultiplier = ($(this).val() == "") ? 1 : $(this).val();
    var parsedAddr, reqQty;

    for (var i = 0, n = reqQtys.length; i < n; i++) {
        parsedAddr = reqQtys[i].id.split('-');
        reqQty = BOMObj[parsedAddr[1]].quantity;
        $('#'+reqQtys[i].id).html(BOMmultiplier*reqQty);

        var optqtyId = '#optqty-'+parsedAddr[1]+'-'+parsedAddr[2];
        $(optqtyId).val(OptimalQty(optqtyId).qty);    
        updateRowTotal($(optqtyId).val(), parsedAddr);
    }

    updatePriceBreaks();
});

//submit selected parts to insert them into cart
$('#submitRes').click(function(){
    var selectedParts = $("input[type=radio]:checked");

    var cartItems=[];
    for (var i = 0; i < selectedParts.length; i++) {
        var item = selectedParts[i];
        var parsedAddr = item.id.split('-');
        cartItems.push({
            "MouserPartNumber": $('#partnr-'+parsedAddr[1]+'-'+parsedAddr[2]).html(), 
            "Quantity": parseInt($('#optqty-'+parsedAddr[1]+'-'+parsedAddr[2]).val()), 
            "CustomerPartNumber": ""});
    }
    $.post('/cart', {"cartItems": JSON.stringify(cartItems)}, cartDone);
 });
 
 //calculate total order price every time new part selected
 $('input[type=radio]').change(function() {
    var selectedParts = $("input[type=radio]:checked");
    var totalPrice = 0;
    for (var i = 0; i < selectedParts.length; i++) {
        var item = selectedParts[i];
        var parsedAddr = item.id.split('-');
        totalPrice += parseFloat($('#total-'+parsedAddr[1]+'-'+parsedAddr[2]).html());
    } 
    $('#order-total').html(totalPrice.toFixed(2) + ' €');
});

//preselect the best part search result
function selectBestPart() {
    for (var key in mouserObj) {
        var resultObj = mouserObj[key];
        if (resultObj.SearchResults.NumberOfResult == 1) { //if only one search result, select it
            //console.log(key);
            selectRadioBtn($('#select-'+ key + '-0'));
        }
        else if (resultObj.SearchResults.NumberOfResult > 1) {//if more than one search results
            var allTotalPrices = [];
            var foundExactMatch = 0;
            resultObj.SearchResults.Parts.forEach(function(part, index) {
                if (BOMObj[key]["part number"] == part.ManufacturerPartNumber) {//select the exact match with Manufacturer Part No
                    selectRadioBtn($('#select-'+ key + '-' + index));
                    foundExactMatch = 1;
                }
                allTotalPrices[index] = parseFloat(OptimalQty(`foo-${key}-${index}`).price);
            });
            if(!foundExactMatch) {//if exact match not found, select the lowest total price
                //console.log(allTotalPrices);
                var minimum = Math.min(...allTotalPrices);
                var index = allTotalPrices.indexOf(minimum);
                //console.log(index+': '+ minimum);
                selectRadioBtn($('#select-'+ key + '-' + index));

            }
        }
    }
}
//enable deseecting a radio button for a part
$("input[type='radio']").click(function(){ 
    if ($(this).hasClass('selected')) {
        $(this).removeClass('selected');
        $(this).prop('checked', false);
    } else {
        selectRadioBtn($(this));
    }
});
//select radio button
function selectRadioBtn(radioBtn) {
    radioBtn.prop("checked", true);
    radioBtn.addClass('selected');
}




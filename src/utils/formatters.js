const escapeMarkdown = (text) => {
    if (!text) return '';
    return String(text).replace(/([_*`\[\]])/g, '\\$1');
};

const formatPrice = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0,00 €';
    return num.toFixed(2).replace('.', ',') + ' €';
};

const formatInvoice = (items, total, paymentMethod, orderId = null, extraOptions = {}) => {
    const isReview = extraOptions.isReview || false;
    let text = '📦 *Bestellübersicht*\n';
    
    if (orderId) {
        text += `📋 *Order-ID:* \`#${escapeMarkdown(orderId)}\`\n`;
    }
    
    text += '\n';

    const itemList = Array.isArray(items) ? items : [items];
    itemList.forEach(item => {
        if (!item) return;
        const safePath = item.category_path ? escapeMarkdown(item.category_path) : '';
        const pathString = safePath ? `_${safePath}_ » ` : ''; 
        const safeName = escapeMarkdown(item.name || 'Artikel');
        const qty = item.quantity || 1;
        const prc = item.price || 0;
        const tot = item.total !== undefined ? item.total : (prc * qty);
        
        text += `▪️ ${qty}x ${pathString}${safeName} (${formatPrice(prc)}) = ${formatPrice(tot)}\n`;
    });

    text += `\n━━━━━━━━━━━━━━━\n`;
    
    if (extraOptions.shippingMethodName) {
        const costStr = (extraOptions.shippingCost && extraOptions.shippingCost > 0) ? ` (+${formatPrice(extraOptions.shippingCost)})` : ' (Kostenlos)';
        text += `🚚 *Versandart:* ${escapeMarkdown(extraOptions.shippingMethodName)}${costStr}\n`;
    }

    if (extraOptions.discountAmount > 0 || (extraOptions.shippingCost && extraOptions.shippingCost > 0)) {
        text += `💶 *Warenwert:* ${formatPrice(total)}\n`;
        if (extraOptions.discountAmount > 0) {
            text += `🎟️ *Gutschein-Rabatt (${escapeMarkdown(extraOptions.couponCode || 'Coupon')}):* -${formatPrice(extraOptions.discountAmount)}\n`;
        }
        if (extraOptions.shippingCost && extraOptions.shippingCost > 0) {
            text += `🚚 *Versandkosten:* +${formatPrice(extraOptions.shippingCost)}\n`;
        }
        const finalTotal = Math.max(0, (parseFloat(total) - (parseFloat(extraOptions.discountAmount) || 0)) + (parseFloat(extraOptions.shippingCost) || 0));
        text += `💶 *Euro-Endbetrag:* ${formatPrice(finalTotal)}\n`;
    } else {
        text += `💶 *Euro-Gesamtsumme:* ${formatPrice(total)}\n`;
    }
    
    const safePaymentName = escapeMarkdown(paymentMethod ? paymentMethod.name : 'Gewählte Zahlungsart');
    text += `💳 *Gewählte Zahlungsart:* ${safePaymentName}\n`;

    if (isReview) {
        if (extraOptions.isCash) {
            text += `\nℹ️ *Hinweis zum Checkout:*\n_Mit Klick auf "Bestellung abschicken" wird deine Bestellung verbindlich übermittelt. Die Bezahlung erfolgt in bar bei Übergabe / Abholung._\n`;
        } else {
            text += `\nℹ️ *Hinweis zum Checkout:*\n_Mit Klick auf "Bestellung abschicken" wird deine Bestellung verbindlich übermittelt, der tagesaktuelle Krypto-Wechselkurs berechnet und deine persönliche Zahlungsadresse zum Kopieren freigeschaltet._\n`;
        }
        return text;
    }

    if (extraOptions.isCash) {
        text += `\n💵 *Barzahlung bei Übergabe / Abholung*\n`;
        if (paymentMethod && paymentMethod.wallet_address) {
            text += `📝 *Hinweis:* _${escapeMarkdown(paymentMethod.wallet_address)}_\n`;
        }
        return text;
    }

    if (paymentMethod && paymentMethod.wallet_address) {
        text += `\n📍 *Zahlungsadresse:*\n\`${paymentMethod.wallet_address}\`\n_(Tippe zum Kopieren)_\n`;
    }

    if (extraOptions.cryptoAmountFormatted) {
        text += `\n🪙 *Exakter Krypto-Betrag (inkl. Kennziffer):*\n\`${extraOptions.cryptoAmountFormatted}\`\n_(Tippe zum Kopieren)_\n`;
    }

    if (extraOptions.paymentIdentifier) {
        text += `\n📌 *4-stellige Kennziffer / Zahlungs-ID:* \`${extraOptions.paymentIdentifier}\`\n`;
    }

    if (paymentMethod && paymentMethod.auto_verify) {
        text += `\n⚡ *AUTOMATISCHE ZAHLUNGSERKENNUNG AKTIV*\n` +
            `_Das System prüft die Blockchain automatisch im Hintergrund. Nach 1 Bestätigung wird deine Bestellung freigeschaltet!_\n`;
    }

    if (paymentMethod && paymentMethod.description) {
        const safeDesc = escapeMarkdown(paymentMethod.description);
        text += `\n📝 *Hinweis:* _${safeDesc}_\n`;
    }

    return text;
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
        return new Date().toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

module.exports = {
    escapeMarkdown,
    formatPrice,
    formatInvoice,
    formatDate
};

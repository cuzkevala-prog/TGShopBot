const { Scenes } = require('telegraf');
const shippingRepo = require('../../database/repositories/shippingRepo');
const formatters = require('../../utils/formatters');

const cleanup = async (ctx) => {
    if (ctx.wizard.state.messagesToDelete) {
        for (const msgId of ctx.wizard.state.messagesToDelete) {
            await ctx.telegram.deleteMessage(ctx.chat.id, msgId).catch(() => {});
        }
        ctx.wizard.state.messagesToDelete = [];
    }
};

const backToShippingMenu = async (ctx) => {
    ctx.update.callback_query = { data: 'master_manage_shipping', from: ctx.from };
    return ctx.scene.leave();
};

const addShippingMethodScene = new Scenes.WizardScene(
    'addShippingMethodScene',
    async (ctx) => {
        ctx.wizard.state.data = {};
        ctx.wizard.state.messagesToDelete = [];

        const prompt = '🚚 *Neue Versandmethode anlegen*\n\n' +
            'Bitte gib den *Namen* der Versandmethode ein:\n' +
            '_(z. B. "DHL Paket (versichert)" oder "Briefversand Standard")_';

        const msg = await ctx.reply(prompt, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[{ text: '❌ Abbrechen', callback_data: 'cancel_ship_scene', style: 'danger' }]]
            }
        });
        ctx.wizard.state.messagesToDelete.push(msg.message_id);
        ctx.wizard.state.step = 'name';
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.callbackQuery && ctx.callbackQuery.data === 'cancel_ship_scene') {
            await ctx.answerCbQuery('Abgebrochen').catch(() => {});
            await cleanup(ctx);
            await ctx.reply('❌ Erstellung abgebrochen.', {
                reply_markup: {
                    inline_keyboard: [[{ text: '🔙 Zurück zu Versandmethoden', callback_data: 'master_manage_shipping', style: 'primary' }]]
                }
            });
            return ctx.scene.leave();
        }

        if (ctx.wizard.state.step === 'name' && ctx.message?.text) {
            const name = ctx.message.text.trim();
            if (name.startsWith('/')) return;
            ctx.wizard.state.messagesToDelete.push(ctx.message.message_id);
            ctx.wizard.state.data.name = name;
            ctx.wizard.state.step = 'cost';

            const costPrompt = `💰 *Versandkosten für "${name}"*\n\n` +
                `Bitte gib die Versandkosten / den Aufpreis ein:\n` +
                `_(z. B. \`5.49\` oder \`0\` für kostenlosen Versand)_`;

            const msg = await ctx.reply(costPrompt, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🆓 Kostenloser Versand (0,00 €)', callback_data: 'free_shipping', style: 'success' }],
                        [{ text: '❌ Abbrechen', callback_data: 'cancel_ship_scene', style: 'danger' }]
                    ]
                }
            });
            ctx.wizard.state.messagesToDelete.push(msg.message_id);
            return;
        }

        let cost = null;
        if (ctx.callbackQuery && ctx.callbackQuery.data === 'free_shipping') {
            ctx.answerCbQuery().catch(() => {});
            cost = 0.00;
        } else if (ctx.wizard.state.step === 'cost' && ctx.message?.text) {
            ctx.wizard.state.messagesToDelete.push(ctx.message.message_id);
            const parsed = parseFloat(ctx.message.text.trim().replace(',', '.'));
            if (isNaN(parsed) || parsed < 0) {
                const warnMsg = await ctx.reply('⚠️ Bitte gib einen gültigen Betrag >= 0 ein (z. B. `4.99`):', {
                    reply_markup: {
                        inline_keyboard: [[{ text: '❌ Abbrechen', callback_data: 'cancel_ship_scene', style: 'danger' }]]
                    }
                });
                ctx.wizard.state.messagesToDelete.push(warnMsg.message_id);
                return;
            }
            cost = parsed;
        }

        if (cost !== null) {
            try {
                const name = ctx.wizard.state.data.name;
                const created = await shippingRepo.addShippingMethod(name, cost);
                await cleanup(ctx);

                await ctx.reply(
                    `✅ *Versandmethode erfolgreich angelegt!*\n\n` +
                    `🚚 *Name:* ${name}\n` +
                    `💰 *Kosten:* ${formatters.formatPrice(cost)}\n\n` +
                    `Diese Versandart steht Kunden nun bei physischen Bestellungen mit Versand zur Auswahl.`,
                    {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [[{ text: '🔙 Zurück zu Versandmethoden', callback_data: 'master_manage_shipping', style: 'primary' }]]
                        }
                    }
                );
            } catch (error) {
                console.error('addShippingMethod error:', error.message);
                await ctx.reply(`❌ Fehler beim Anlegen: ${error.message}`);
            }
            return ctx.scene.leave();
        }
    }
);

module.exports = addShippingMethodScene;

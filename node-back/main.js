import Elysia from 'elysia';
import Anthropic from "@anthropic-ai/sdk";
import cors from "@elysiajs/cors";
import superagent from 'superagent';

const API_KEY = 'sk-xxxxx'


async function chat({body}) {
    const {image, prompt} = body || {};

    const anthropic = new Anthropic({
        apiKey: API_KEY,
        baseURL: "https://dashscope.aliyuncs.com/apps/anthropic",
    });

    try {
        let content = [{
            type: "text",
            text: prompt
        }]
        if (image) content.unshift({
            type: "image",
            source: {
                type: "base64",
                media_type: "image/jpeg",
                data: image
            },
        })


        const response = await anthropic.messages.create({
            model: "qwen3.6-plus",
            max_tokens: 2048,
            stream: false,
            messages: [{
                role: "user",
                content
            }],
            thinking: {type: "disabled"},
        });

        const fullText = response.content.at(-1).text;

        return new Response(fullText, {
            headers: {'Content-Type': 'application/json'}
        });
    } catch (error) {
        return new Response(JSON.stringify({error: error.message}), {
            status: 500,
            headers: {'Content-Type': 'application/json'}
        });
    }
}


async function tts({body}) {
    try {
        const {text, lang} = body || {};

        let apiData = {
            model: "cosyvoice-v3-flash",
            input: {
                text: text,
                voice: "longyingtao_v3",
                format: "wav",
                sample_rate: 24000,
                language_hints: [lang]
            }
        }
        let headers = {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
        }

        let requestUrl = 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer'
        const response = await superagent.post(requestUrl).send(apiData).set(headers)

        let url = response.body?.output?.audio?.url
        if (!url) throw new Error('生成失败！')

        return new Response(JSON.stringify({
            data: url,
            format: "wav",
            sample_rate: 24000
        }), {
            headers: {'Content-Type': 'application/json'}
        });
    } catch (error) {
        return new Response(JSON.stringify({error: error.message}), {
            status: 500,
            headers: {'Content-Type': 'application/json'}
        });
    }
}

const app = new Elysia().use(cors({origin: '*'}))
const PORT = 13010;

app.post('/api/chat', chat);
app.post('/api/tts', tts);

app.listen(PORT);
console.log(`🦊 Elysia is running at on port ${app.server?.port}...`);
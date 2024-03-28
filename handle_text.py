from flask import Flask, request
from flask_cors import CORS

from langchain_core.prompts import ChatPromptTemplate
from langchain.memory import ConversationBufferMemory
from langchain_groq import ChatGroq
from dotenv import load_dotenv
import os
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from langchain.prompts import (
    ChatPromptTemplate,
    MessagesPlaceholder,
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
)
from langchain.chains import LLMChain

load_dotenv()

app = Flask(__name__)
CORS(app)

# Streaming
def streaming(text):
	llm = ChatGroq(temperature=0, model_name="mixtral-8x7b-32768", groq_api_key="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")
	memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
	with open('system_prompt.txt', 'r') as file:
		system_prompt = file.read().strip()
		
	prompt = ChatPromptTemplate.from_messages([SystemMessagePromptTemplate.from_template(system_prompt), 
    		  MessagesPlaceholder(variable_name="chat_history"), HumanMessagePromptTemplate.from_template("{text}")])
    
	conversation = LLMChain(llm=llm, prompt=prompt, memory=memory)
	memory.chat_memory.add_user_message(text)
	response = conversation.invoke({"text": text})
    
    # print(f"LLM ({elapsed_time}ms): {response['text']}")
	return response['text']

@app.route('/speech', methods=['GET', 'POST'])
def receive_speech():
    if request.method == 'POST':
        speech_text = request.json.get('text')
        # print("Received speech text:", speech_text)
        # Add your logic to process the speech text here
        res = streaming(speech_text)
        print(f"LLM : {res}")
        
        # return "Speech received successfully", 200
        return res, 200
    else:
        return "Method not allowed", 405

if __name__ == '__main__':
    app.run(port="0.0.0.0", port=80)


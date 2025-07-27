Econ-Financas: Evolução de um Gerenciador de Gastos Pessoais
Este repositório documenta o avanço de um pequeno projeto de gerenciamento de gastos pessoais, desenvolvido com a assistência do Gemini AI. Meu objetivo é explorar e aprender a criar aplicações web simples utilizando prompts bem estruturados, focando na evolução das funcionalidades e da arquitetura do projeto.

Estrutura do Repositório
O projeto está organizado em três pastas principais, cada uma representando uma fase de desenvolvimento:

📁 EconFinancas 1
Esta pasta contém a primeira versão do projeto. É um aplicativo web simples, construído apenas com HTML, CSS e JavaScript. Sua funcionalidade principal é o registro de gastos e a exibição da soma total. É uma versão básica, ideal para o aprendizado inicial de manipulação de elementos da interface.

📁 EconFinancas 2
A segunda versão aprimora significativamente as funcionalidades. Mantendo a arquitetura de frontend puro (HTML, CSS, JavaScript), ela introduz:

Categorias de Gastos: Permite classificar as despesas.

Análises e Comparações: Oferece visualizações e resumos dos gastos por categoria.

Apesar de mais completa, esta versão não é tão usual na prática, pois as informações de gastos são facilmente perdidas ao recarregar a página ou fechar o navegador, devido ao uso exclusivo do localStorage para persistência de dados.

📁 EconFinancas 3
Esta é a terceira e mais recente versão, representando um salto significativo na arquitetura do projeto. Pensando na usabilidade e na persistência dos dados, esta versão foi desenvolvida utilizando:

Flask (Python): Como framework de backend, gerenciando a lógica do aplicativo e a comunicação com o banco de dados.

SQLite: Um banco de dados leve e local, que pode ser alocado na máquina de quem utilizar o aplicativo.

Com esta implementação, os dados de gastos e categorias são mantidos salvos, permitindo um real aproveitamento e utilização contínua do aplicativo. Esta versão demonstra como integrar um frontend com um backend robusto para garantir a persistência das informações.

Como Rodar o Projeto (Versão 3 - Flask)
Para rodar a versão mais recente do aplicativo (EconFinancas 3), siga os passos abaixo:

Clone o Repositório:

git clone https://github.com/Fernandodev0102/Econ-Financas.git
cd Econ-Financas

Navegue até a Pasta do Projeto Flask:

cd EconFinancas\ 3

(Use EconFinancas\ 3 com a barra invertida para escapar o espaço no nome da pasta, ou cd "EconFinancas 3" com aspas.)

Crie e Ative um Ambiente Virtual:

python -m venv venv
# No Windows:
.\venv\Scripts\activate
# No macOS/Linux:
source venv/bin/activate

Instale as Dependências:

pip install Flask Flask-SQLAlchemy

Inicialize o Banco de Dados:

python
from app import app, db, Category
with app.app_context():
    db.create_all()
    if not db.session.query(db.exists().where(Category.name == 'Alimentação')).scalar():
        db.session.add(Category(name='Alimentação'))
        db.session.add(Category(name='Transporte'))
        db.session.add(Category(name='Lazer'))
        db.session.add(Category(name='Moradia'))
        db.session.add(Category(name='Saúde'))
        db.session.add(Category(name='Educação'))
        db.session.add(Category(name='Outros'))
        db.session.commit()
exit()

Execute o Aplicativo Flask:

flask run

O aplicativo estará disponível em http://127.0.0.1:5000 no seu navegador.

Contribuição
Sinta-se à vontade para explorar o código, sugerir melhorias ou relatar problemas.

Licença
Este projeto está licenciado sob a Licença MIT.

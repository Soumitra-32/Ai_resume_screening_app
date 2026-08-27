
import re

"""
Rule-based skill taxonomy — a curated, categorized list of tech and professional skills.
Serves as the foundation for skill-overlap scoring, resume parsing, and candidate matching.
"""

SKILL_TAXONOMY_CATEGORIZED = {
    # --- PROGRAMMING LANGUAGES ---
    "programming_languages": {
        "python", "java", "javascript", "typescript", "c++", "c#", "go", "golang", "rust",
        "ruby", "php", "swift", "kotlin", "scala", "r", "sql", "html", "css", "bash",
        "shell", "powershell", "perl", "haskell", "elixir", "clojure", "lua", "dart",
        "assembly", "vba", "matlab", "fortran", "objective-c", "groovy", "zig", "julia"
    },

    # --- FRAMEWORKS & LIBRARIES ---
    "frameworks_and_libraries": {
        # Web & Backend
        "react", "react.js", "angular", "vue", "vue.js", "next.js", "nuxt.js", "svelte",
        "node.js", "express", "express.js", "django", "flask", "fastapi", "spring",
        "spring boot", ".net", ".net core", "asp.net", "laravel", "symfony", "rails",
        "ruby on rails", "phoenix", "gin", "fiber", "nestjs", "blazor", "htmx",

        # Mobile
        "react native", "flutter", "ionic", "xamarin", "android sdk",

        # Machine Learning, AI & Data Science
        "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy", "keras", "scipy",
        "opencv", "hugging face", "transformers", "langchain", "llama-index", "spacy",
        "nltk", "lightgbm", "xgboost", "catboost", "jax", "onnx", "polars"
    },

    # --- DATABASES & STORAGE ---
    "databases": {
        "postgresql", "postgres", "mysql", "mongodb", "redis", "sqlite", "oracle",
        "elasticsearch", "cassandra", "dynamodb", "mariadb", "cockroachdb", "neo4j",
        "clickhouse", "snowflake", "bigquery", "redshift", "couchdb", "supabase",
        "firebase", "vectordb", "pinecone", "chromadb", "milvus", "qdrant", "faiss"
    },

    # --- CLOUD, DEVOPS & INFRASTRUCTURE ---
    "cloud_and_devops": {
        "aws", "amazon web services", "azure", "gcp", "google cloud", "docker",
        "kubernetes", "k8s", "terraform", "jenkins", "ci/cd", "github actions",
        "gitlab ci", "ansible", "puppet", "chef", "helm", "argo cd", "prometheus",
        "grafana", "datadog", "splunk", "open-telemetry", "linux", "unix", "nginx",
        "apache", "istio", "cloudflare", "pulumi", "vagrant", "circleci"
    },

    # --- DATA ENGINEERING & ANALYTICS ---
    "data_engineering_and_analytics": {
        "machine learning", "deep learning", "nlp", "natural language processing",
        "computer vision", "data analysis", "data engineering", "etl", "elt", "spark",
        "apache spark", "hadoop", "pyspark", "kafka", "apache kafka", "airflow",
        "apache airflow", "dbt", "power bi", "tableau", "looker", "metabase",
        "excel", "data warehousing", "data modeling", "data pipelines", "generative ai",
        "llm", "large language models", "rag", "retrieval-augmented generation"
    },

    # --- SOFTWARE ARCHITECTURE & PARADIGMS ---
    "architecture_and_concepts": {
        "rest api", "restful apis", "graphql", "microservices", "git", "github",
        "gitlab", "unit testing", "tdd", "test-driven development", "bdd", "ci/cd",
        "system design", "object-oriented programming", "oop", "functional programming",
        "event-driven architecture", "domain-driven design", "ddd", "design patterns",
        "websockets", "grpc", "oauth", "jwt", "saml", "sso", "serverless", "pwa"
    },

    # --- CYBERSECURITY ---
    "cybersecurity": {
        "penetration testing", "pen testing", "ethical hacking", "siem", "soc",
        "vulnerability assessment", "owasp", "cryptography", "firewalls", "zero trust",
        "iam", "network security", "incident response", "cissp", "ceh", "comptia security+"
    },

    # --- PRODUCT, DESIGN & MANAGEMENT ---
    "product_and_design": {
        "figma", "adobe xd", "sketch", "ui/ux", "user research", "wireframing",
        "prototyping", "design systems", "jira", "confluence", "trello", "asana",
        "product management", "product roadmap", "a/b testing", "google analytics"
    },

    # --- PROCESSES, METHODOLOGIES & SOFT SKILLS ---
    "process_and_soft_skills": {
        "agile", "scrum", "kanban", "project management", "leadership", "communication",
        "problem solving", "critical thinking", "teamwork", "collaboration",
        "stakeholder management", "time management", "adaptability", "mentorship",
        "strategic thinking", "negotiation", "conflict resolution"
    }
}

# Flatten the categorized taxonomy into a single master set for fast lookup
SKILL_TAXONOMY: set[str] = {
    skill
    for category in SKILL_TAXONOMY_CATEGORIZED.values()
    for skill in category
}


def normalize_skill(skill: str) -> str:
    """Standardizes skill string for comparison."""
    return skill.strip().lower()


def extract_skills_from_text(text: str) -> list[str]:
    """
    Rule-based skill extraction: scan text for taxonomy matches using regex boundary matching.

    Skills are sorted by length in descending order to prioritize longer matching
    phrases before shorter sub-phrases (e.g., 'spring boot' before 'spring').
    """
    text_lower = text.lower()
    found = set()

    # Sort taxonomy terms by length descending to match composite skills first
    sorted_taxonomy = sorted(SKILL_TAXONOMY, key=len, reverse=True)

    for skill in sorted_taxonomy:
        # Escape special regex characters (like C++, .NET, CI/CD) safely
        escaped_skill = re.escape(skill)

        # Match boundaries considering letters, digits, and specific skill symbols (+, #, .)
        pattern = rf"(?<![a-zA-Z0-9+#.]){escaped_skill}(?![a-zA-Z0-9+#.])"

        if re.search(pattern, text_lower):
            found.add(skill)

    return sorted(found)



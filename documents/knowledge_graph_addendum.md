AI Scholar — Knowledge Graph Extension                                 Phase 1.5 Addendum




                                  AI Scholar
                         Knowledge Graph Extension
                 Phase 1.5 Addendum — Implementation-Ready Design
             A zero-destructive-migration bolt-on to the Phase 1 RAG pipeline
         adding four new tables, one new API endpoint, and a topic-extraction hook.


                                 Prepared for: Ragu

                                       July 2026


 Scope of this addendum. This document is a direct continuation of the AI Scholar
 Unified Design Document and should be read alongside it. Section and appendix
 numbering continues from that document (§7 onward, Appendix C). No table, index,
 or RLS policy defined in the main document is modified here; only additions are
 made.



Contents
7 Knowledge Graph Layer                                                                   3
  7.1 Motivation . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 3
  7.2 Why Now (after Phase 1, before Phase 2) . . . . . . . . . . . . . . . . . . . 3
  7.3 Graph Data Model . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 3
      7.3.1 Node Types . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 3
      7.3.2 Edge Types . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 4
  7.4 Schema . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 4
      7.4.1 Design Principles (additions to §5.1) . . . . . . . . . . . . . . . . . 4
      7.4.2 topics . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 4
      7.4.3 document topics . . . . . . . . . . . . . . . . . . . . . . . . . . . . 5
      7.4.4 document connections . . . . . . . . . . . . . . . . . . . . . . . . 5
      7.4.5 topic connections . . . . . . . . . . . . . . . . . . . . . . . . . . 6
  7.5 Row-Level Security . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 6
  7.6 Indexes . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 7
  7.7 Pipeline Integration . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 8
      7.7.1 Hook Location . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 8
      7.7.2 Step-by-Step Post-Processing Flow . . . . . . . . . . . . . . . . . . 8
      7.7.3 Topic Extraction Prompt . . . . . . . . . . . . . . . . . . . . . . . . 9
  7.8 API Specification . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 9
      7.8.1 GET /v1/knowledge-graph . . . . . . . . . . . . . . . . . . . . . . 9
      7.8.2 POST /v1/knowledge-graph/rebuild . . . . . . . . . . . . . . . . 11


                 Supabase + pgvector + PostgreSQL + Next.js + FastAPI                    1
AI Scholar — Knowledge Graph Extension                                 Phase 1.5 Addendum


        7.8.3 GET /v1/documents/{id}/similar . . . . . . . . . . . . . . . . . .          11
        7.8.4 Endpoint Summary (additions to §6.7) . . . . . . . . . . . . . . . .        12
   7.9 Implementation Order . . . . . . . . . . . . . . . . . . . . . . . . . . . . .     12
   7.10 Out of Scope for This Phase . . . . . . . . . . . . . . . . . . . . . . . . . .   12
   7.11 Full Schema Reference (knowledge graph tables) . . . . . . . . . . . . . . .      13

C Appendix C — Endpoint-to-Schema Field Parity (Knowledge Graph) 14
  C.1 C.1 /v1/knowledge-graph node fields . . . . . . . . . . . . . . . . . . . . 14
  C.2 C.2 /v1/knowledge-graph edge fields . . . . . . . . . . . . . . . . . . . . . 14




                 Supabase + pgvector + PostgreSQL + Next.js + FastAPI                      2
AI Scholar — Knowledge Graph Extension                                 Phase 1.5 Addendum



7       Knowledge Graph Layer
7.1     Motivation
The Phase 1 RAG pipeline answers questions grounded in a single document. Once a
student uploads multiple documents, an entirely new kind of value becomes possible:
cross-document discovery. Without a knowledge graph, the student has no way to know
that their OS Notes and System Design document both cover Concurrency in depth, or
that understanding Deadlock requires Concurrency as a prerequisite.
The knowledge graph layer surfaces these relationships explicitly, giving the student a
navigable map of their own uploaded knowledge.
Three relationship types drive the feature:
1. Document → Topic (covers). Every document covers a set of topics extracted from
   its chunks by the LLM. Relevance is scored so that a document that mentions Deadlock
   in forty chunks ranks it higher than one that mentions it twice.
2. Document ↔ Document (semantically similar). Documents whose average
   chunk embeddings are cosine-similar above a threshold (0.50 recommended) are con-
   nected. This reveals that two different textbooks cover the same subject, even without
   sharing exact topic names.
3. Topic ↔ Topic (prerequisite / related). Topics extracted from the same or differ-
   ent documents are compared by their own embeddings; high-similarity pairs are stored
   as related. The LLM can additionally label a pair as prerequisite when one concept
   logically precedes the other.

7.2     Why Now (after Phase 1, before Phase 2)
 All embeddings already exist in document chunks; no re-embedding is required.
 The four new tables add zero columns to any existing table.
 The pipeline hook fires after status = ’ready’ — the same state transition already
  implemented.
 The frontend can display the graph before quizzes or study plans exist, making it a
  standalone demo milestone.

7.3     Graph Data Model
7.3.1       Node Types

    Node type     Source table    Visual         Carries
    Document      documents       Large circle   Title, subject area, page count, process-
                                                 ing status, latest quiz score
    Topic         topics          Small circle   Canonical name, subject area, docu-
                                                 ment count




                  Supabase + pgvector + PostgreSQL + Next.js + FastAPI                       3
AI Scholar — Knowledge Graph Extension                                     Phase 1.5 Addendum


7.3.2   Edge Types


Edge type      Source table                   Direction                    Key field            Visual
covers         document topics                Doc → Topic                  relevance score      Thin grey s
similar        document connections           Doc − Doc (undirected)       similarity score     Thick blue
prerequisite   topic connections              Topic → Topic                strength             Purple dash
related        topic connections              Topic − Topic (undirected)   strength             Green dashe


7.4     Schema
7.4.1   Design Principles (additions to §5.1)
 No changes to existing tables. Every new table references existing primary keys as
  foreign keys; no existing column is added to or removed from the main schema.
 Deduplication by constraint, not by application logic. UNIQUE constraints
  on (user id, name) for topics, (document id, topic id) for document-topic edges,
  and the ordering constraint CHECK (source doc id < target doc id) for document-
  document edges make repeated pipeline runs idempotent.
 Nullable embeddings on topics. A topic row can exist before its embedding is
  computed; the vector column accepts NULL so that topic extraction and topic embedding
  can be decoupled into two async steps.
 Array column for shared topics. document connections stores shared topic ids
  UUID[] as a snapshot. This avoids a three-way join at graph-fetch time, at the cost of
  slight staleness when topics are re-extracted. Acceptable for a read-heavy graph view.

7.4.2   topics
Canonical concept nodes. One row per (user, topic name) pair. Deduplication at the
constraint level means that re-running topic extraction on an updated document upserts
rather than duplicates.
 CREATE TABLE topics (
     id            UUID          PRIMARY KEY DEFAULT gen_random_uuid
        () ,
     user_id       UUID          NOT NULL REFERENCES profiles ( id ) ON
          DELETE CASCADE ,
     name          TEXT          NOT NULL ,
     description TEXT ,
     subject_area TEXT ,
     embedding     VECTOR (1536) ,           -- nullable ; set after
        extraction
     created_at    TIMESTAMPTZ DEFAULT now () ,
     updated_at    TIMESTAMPTZ DEFAULT now () ,
     UNIQUE ( user_id , name )              -- idempotent upsert
        target
 );

 CREATE TRIGGER t r g _ t o p i c s _ u p d a t e d _ a t

                   Supabase + pgvector + PostgreSQL + Next.js + FastAPI                     4
AI Scholar — Knowledge Graph Extension                               Phase 1.5 Addendum


        BEFORE UPDATE ON topics
        FOR EACH ROW EXECUTE FUNCTION set_updated_at () ;
                           Listing 1: topics table definition


  Embedding dimension. VECTOR(1536) matches document chunks.embedding so
  that topic-to-chunk cosine comparisons use the same numeric space without rescaling.


7.4.3    document topics
The many-to-many join between documents and topics. Each row records how strongly a
document covers a topic (relevance score) and how many chunks mention it (mention count).
 CREATE TABLE document_topics (
     id               UUID PRIMARY KEY DEFAULT gen_random_uuid () ,
     document_id      UUID NOT NULL REFERENCES documents ( id ) ON
        DELETE CASCADE ,
     topic_id         UUID NOT NULL REFERENCES topics ( id )    ON
        DELETE CASCADE ,
     relevance_score FLOAT CHECK ( relevance_score BETWEEN 0 AND
        1) ,
     mention_count    INTEGER DEFAULT 1
                      CHECK ( mention_count >= 1) ,
     created_at       TIMESTAMPTZ DEFAULT now () ,
     UNIQUE ( document_id , topic_id )     -- idempotent upsert
        target
 );
                      Listing 2: document topics table definition


Upsert pattern (FastAPI). Pipeline runs use INSERT ...ON CONFLICT (document id,
topic id) DO UPDATE SET relevance score = EXCLUDED.relevance score, mention count
= EXCLUDED.mention count so that re-processing a document replaces stale scores.

7.4.4    document connections
Pairwise document similarity edges. Only pairs with similarity score ≥ 0.50 are
stored; sparser pairs would add noise to the graph without value. The ordering constraint
eliminates the A ↔ B / B ↔ A duplication problem.
 CREATE TABLE d o c u m e n t _ c o n n e c t i o n s (
     id                       UUID            PRIMARY KEY DEFAULT   gen_random_uuid
        () ,
     user_id                  UUID            NOT NULL REFERENCES   profiles ( id )
        ON DELETE CASCADE ,
     source_doc_id            UUID            NOT NULL REFERENCES   documents ( id )
        ON DELETE CASCADE ,
     target_doc_id            UUID            NOT NULL REFERENCES   documents ( id )
        ON DELETE CASCADE ,
     similarity_score FLOAT                   NOT NULL


                 Supabase + pgvector + PostgreSQL + Next.js + FastAPI                    5
AI Scholar — Knowledge Graph Extension                                Phase 1.5 Addendum


                           CHECK ( similarity_score BETWEEN 0 AND 1) ,
        shared_topic_ids UUID [] DEFAULT ’ {} ’ ,   -- snapshot ;
           updated on re - analysis
        connection_type TEXT        NOT NULL
                           CHECK ( connection_type IN ( ’ semantic ’ , ’
                              topic_overlap ’) ) ,
        created_at         TIMESTAMPTZ DEFAULT now () ,
        UNIQUE ( source_doc_id , target_doc_id ) ,
        CHECK ( source_doc_id < target_doc_id )     -- A < - > B stored
           once , ordered by PK
 );
                   Listing 3: document connections table definition


  Query direction. Because source doc id < target doc id is enforced, the graph-
  fetch query must union both directions: WHERE source doc id = ANY($user doc ids)
  OR target doc id = ANY($user doc ids). Omitting the second clause silently drops
  half the edges.


7.4.5    topic connections
Topic-to-topic relationship edges. Two relationship types are distinguished so the frontend
can render prerequisite chains differently from related-concept clusters.
 CREATE TABLE top ic_con nectio ns (
     id                UUID PRIMARY KEY DEFAULT gen_random_uuid () ,
     user_id           UUID NOT NULL REFERENCES profiles ( id ) ON
        DELETE CASCADE ,
     source_topic_id UUID NOT NULL REFERENCES topics ( id ) ON
        DELETE CASCADE ,
     target_topic_id UUID NOT NULL REFERENCES topics ( id ) ON
        DELETE CASCADE ,
     relationship      TEXT NOT NULL
                       CHECK ( relationship IN ( ’ prerequisite ’ , ’
                          related ’ , ’ subtopic ’) ) ,
     strength          FLOAT CHECK ( strength BETWEEN 0 AND 1) ,
     created_at        TIMESTAMPTZ DEFAULT now () ,
     UNIQUE ( user_id , source_topic_id , target_topic_id )
 );
                     Listing 4: topic connections table definition


Directionality. prerequisite is directed: source topic id must be understood be-
fore target topic id. related is symmetric but stored once (lower UUID first is a
recommended convention, though not enforced by constraint here because the semantic
direction of prerequisite must be preserved).

7.5     Row-Level Security
All four tables follow the same ownership model as the main schema (§5.7).

                 Supabase + pgvector + PostgreSQL + Next.js + FastAPI                    6
AI Scholar — Knowledge Graph Extension                                           Phase 1.5 Addendum



 -- Enable
 ALTER TABLE        topics                           ENABLE    ROW    LEVEL      SECURITY ;
 ALTER TABLE        document_topics                  ENABLE    ROW    LEVEL      SECURITY ;
 ALTER TABLE        document_connections             ENABLE    ROW    LEVEL      SECURITY ;
 ALTER TABLE        topic _conne ctions              ENABLE    ROW    LEVEL      SECURITY ;

 -- Pattern A ( direct user_id column )
 CREATE POLICY own_topics ON topics
     FOR ALL USING      ( auth . uid () = user_id )
     WITH CHECK         ( auth . uid () = user_id ) ;

 CREATE POLICY ow n _ do c _ c on n e ct i o ns ON d o c u m e n t _ c o n n e c t i o n s
     FOR ALL USING           ( auth . uid () = user_id )
     WITH CHECK              ( auth . uid () = user_id ) ;

 CREATE POLICY o w n _ t o p i c _ c on n e c t i o n s ON to pic_co nnecti ons
     FOR ALL USING             ( auth . uid () = user_id )
     WITH CHECK                ( auth . uid () = user_id ) ;

 -- Pattern B ( ownership via foreign - key chain )
 CREATE POLICY ow n _ do c u m en t _ to p i cs ON document_topics
     FOR ALL USING (
         document_id IN (
             SELECT id FROM documents WHERE user_id = auth . uid ()
         )
     );
                 Listing 5: Enable RLS and write policies on all four tables


7.6    Indexes
 -- Relational indexes
 CREATE INDEX idx_topics_user                               ON topics                        (
    user_id ) ;
 CREATE INDEX i dx _d oc _t op ic s_ do c                   ON document_topics (
    document_id ) ;
 CREATE INDEX i d x _ d o c _ t o p i c s _ t o p i c       ON document_topics (
    topic_id ) ;
 CREATE INDEX idx _doc_c onn_us er                          ON d o c u m e n t _ c o n n e c t i o n s (
    user_id ) ;
 CREATE INDEX id x _ do c _ co n n _ so u r ce              ON d o c u m e n t _ c o n n e c t i o n s (
    source_doc_id ) ;
 CREATE INDEX id x _ do c _ co n n _ ta r g et              ON d o c u m e n t _ c o n n e c t i o n s (
    target_doc_id ) ;
 CREATE INDEX id x _ to p i c_ c o n n_ u s er              ON to pic_co nnecti ons (
    user_id ) ;
 CREATE INDEX i d x _ t o p i c _ c o n n _ s o u r c e     ON to pic_co nnecti ons (
    source_topic_id ) ;
 CREATE INDEX i d x _ t o p i c _ c o n n _ t a r g e t     ON to pic_co nnecti ons (
    target_topic_id ) ;


                   Supabase + pgvector + PostgreSQL + Next.js + FastAPI                                    7
AI Scholar — Knowledge Graph Extension                             Phase 1.5 Addendum



 -- HNSW vector index for topic similarity ( add once >500 topic
    rows exist )
 CREATE INDEX i d x _ t o p i c s _ e mb e d d i n g _ h n s w
     ON topics USING hnsw ( embedding ve ctor_c osine_ ops ) ;
        Listing 6: Relational and vector indexes for the knowledge graph tables


7.7     Pipeline Integration
7.7.1   Hook Location
The knowledge graph pipeline is triggered immediately after the document ingestion
pipeline sets documents.status = ’ready’. No new database trigger is required; the
FastAPI background task that updates the status column calls build knowledge graph(document id,
user id) as its final step.

7.7.2   Step-by-Step Post-Processing Flow
Step 1. Topic extraction. Retrieve the top-10 highest-scoring chunks for the newly
        processed document (ordered by chunk index or by a relevance proxy). Send
        them to the Anthropic API with the extraction prompt in §7.6.3. Parse the
        JSON response into 3–6 topic objects.
Step 2. Upsert topics. For each topic returned, execute INSERT INTO topics (...)
        ON CONFLICT (user id, name) DO UPDATE SET description = EXCLUDED.description,
        subject area = EXCLUDED.subject area. Capture the resulting id values.
Step 3. Upsert document-topic edges. For each (document, topic) pair, execute
        INSERT INTO document topics (...) ON CONFLICT (document id, topic id)
        DO UPDATE SET relevance score = EXCLUDED.relevance score, mention count
        = EXCLUDED.mention count.
Step 4. Embed new topics. Call text-embedding-3-small for each topic whose
        embedding IS NULL. Update the row.
Step 5. Compute topic-topic similarity. Load all topic embeddings belonging to this
        user. For every pair (new topic, existing topic), compute cosine similarity.
        Insert pairs with similarity ≥ 0.65 into topic connections as related.
Step 6. Compute document-document similarity. Compute the average embed-
        ding for the new document: SELECT AVG(embedding) FROM document chunks
        WHERE document id = $id. Load average embeddings for all other ready doc-
        uments belonging to the same user. Insert pairs with similarity ≥ 0.50 into
        document connections as semantic.
Step 7. Populate shared topic ids. For each inserted document connections row,
        compute the intersection of topic id values from document topics for the two
        documents and write the array.

  Average embedding caveat. Averaging chunk embeddings produces a centroid



                Supabase + pgvector + PostgreSQL + Next.js + FastAPI                8
AI Scholar — Knowledge Graph Extension                                Phase 1.5 Addendum


  that works well for broad subject similarity but blurs fine-grained topic distinctions.
  For Phase 1.5 this is sufficient. A future improvement is to weight each chunk’s
  contribution by its token count before averaging.


7.7.3   Topic Extraction Prompt
The prompt below is sent to claude-sonnet-4-6 with max tokens = 512. The model is
instructed to return only valid JSON with no preamble, matching the Pydantic model on
the FastAPI side.
 SYSTEM :
 You are a topic - extraction assistant for an academic study
     platform .
 Return ONLY a valid JSON array . No markdown fences . No preamble .
 Each element must have exactly these keys :
   " name "            --- canonical topic name , 2 -5 words , Title Case
   " description " --- one sentence explaining the topic
   " subject_area " --- exactly one of : Systems , CS Core , Networks ,
        Data , AI / ML
   " relevance "       --- float 0.0 -1.0 , how central this topic is to
        the chunks

 Return between 3 and 6 topics . Order by descending relevance .

 USER :
 Extract the most important academic topics from the following
 text chunks taken from a student ’ s study document .

 < chunks >
 { chunks_text }
 </ chunks >
                   Listing 7: Topic extraction system + user prompt


Fallback. If the response cannot be parsed as JSON, retry once with a stricter prompt.
If the second parse fails, log the error, set documents.error message, and skip knowledge
graph construction for this document without reverting status = ’ready’.

7.8     API Specification
This section adds three endpoints to the contract layer defined in §6. Conventions from
§6.1 apply unchanged (Bearer JWT, UUID IDs, ISO 8601 timestamps, pagination enve-
lope, error envelope).

7.8.1   GET /v1/knowledge-graph
Returns the complete graph for the authenticated user in a single request. The response
is shaped for direct consumption by a graph renderer (D3 force simulation, Cytoscape,
etc.) without client-side joins.



                 Supabase + pgvector + PostgreSQL + Next.js + FastAPI                       9
AI Scholar — Knowledge Graph Extension                             Phase 1.5 Addendum


 Response schema.
 {
     " nodes ": [
        {
           " id ":        " uuid " ,
           " type ":      " document " ,           // " document " | " topic "
           " label ":     " OS Notes " ,
           " subject ": " Systems " ,
           " metadata ": {
              " pages ":         145 ,
              " status ":        " ready " ,
              " quiz_score ": 82                   // null if no attempt yet
           }
        },
        {
           " id ":        " uuid " ,
           " type ":      " topic " ,
           " label ":     " Deadlock " ,
           " subject ": " Systems " ,
           " metadata ": {
              " doc_count ": 2
           }
        }
     ],
     " edges ": [
        {
           " source ":      " doc_uuid " ,
           " target ":      " topic_uuid " ,
           " type ":        " covers " ,           // " covers " | " similar " |
           " strength ": 0.90                      // " prerequisite " | "
                related "
        },
        {
           " source ":      " doc_uuid_a " ,
           " target ":      " doc_uuid_b " ,
           " type ":        " similar " ,
           " strength ": 0.78
        },
        {
           " source ":      " topic_uuid_a " ,
           " target ":      " topic_uuid_b " ,
           " type ":        " prerequisite " ,
           " strength ": 0.90
        }
     ]
 }
                     Listing 8: GET /v1/knowledge-graph response

 Backend assembly query (pseudocode).
 user_id = jwt . uid ()


                  Supabase + pgvector + PostgreSQL + Next.js + FastAPI             10
AI Scholar — Knowledge Graph Extension                                Phase 1.5 Addendum


 # Nodes
 doc_nodes         = SELECT id , title AS label , subject_area , ...
                     FROM documents
                     WHERE user_id = $ uid AND status != ’ deleted ’

 topic_nodes = SELECT id , name AS label , subject_area , ...
               FROM topics
               WHERE user_id = $ uid

 # Edges --- all three edge tables , unioned
 covers_edges = SELECT document_id AS source , topic_id AS target ,
                       ’ covers ’ AS type , relevance_score AS
                           strength
                FROM document_topics
                WHERE document_id = ANY ( $ user_doc_ids )

 similar_edges = SELECT source_doc_id AS source , target_doc_id AS
     target ,
                          ’ similar ’ AS type , similarity_score AS
                               strength
                 FROM d o c u me n t _ c o n n e c t i o n s
                 WHERE user_id = $ uid
                   AND ( source_doc_id = ANY ( $ user_doc_ids )
                     OR target_doc_id = ANY ( $ user_doc_ids ) )

 topic_edges = SELECT source_topic_id AS source , target_topic_id
     AS target ,
                         relationship AS type , strength
                 FROM to pic_co nnecti ons
                 WHERE user_id = $ uid
                Listing 9: Server-side assembly logic for the graph response


7.8.2    POST /v1/knowledge-graph/rebuild
Triggers a full re-analysis of all ready documents for the authenticated user. Useful after
manually editing topic names or when the extraction model is updated.

        Field                 Type     Notes
        (no request body)     —        Rebuild applies to all ready documents
        queued count      integer      Number of documents queued for re-analysis
        estimated seconds integer      Rough estimate based on doc count

7.8.3    GET /v1/documents/{id}/similar
Returns documents similar to the specified document, with shared topics.
 {
     " data ": [
        {


                   Supabase + pgvector + PostgreSQL + Next.js + FastAPI                 11
 AI Scholar — Knowledge Graph Extension                              Phase 1.5 Addendum


          " document_id ":    " uuid " ,
          " title ":          " System Design Notes " ,
          " similarity_score ": 0.78 ,
          " shared_topics ": [" Concurrency " , " Memory Management "]
         }
      ],
      " page ": 1 , " page_size ": 10 , " total ": 2
  }
                 Listing 10: GET /v1/documents/{id}/similar response


 7.8.4   Endpoint Summary (additions to §6.7)


 Method     Path                              Primary table(s)
 GET        /v1/knowledge-graph         documents, topics, document topics,
                                        document connections, topic connections
 POST       /v1/knowledge-graph/rebuild all four KG tables (write)
 GET        /v1/documents/{id}/similar  document connections, document topics


 7.9     Implementation Order
 1. Create topics with its trigger and UNIQUE constraint.
 2. Create document topics with its UNIQUE constraint.
 3. Create document connections with both UNIQUE and ordering CHECK constraints.
 4. Create topic connections with its UNIQUE constraint.
 5. Apply RLS — enable and write the policy — on all four tables before writing any
    application code that reads them.
 6. Add all relational indexes from §7.5.
 7. Implement the topic extraction function in FastAPI. Test it in isolation on one docu-
    ment before wiring it into the pipeline hook.
 8. Wire the hook into the existing document-processing background task (fires after
    status = ’ready’).
 9. Implement GET /v1/knowledge-graph and verify the response against two or more
    uploaded documents.
10. Add the HNSW index on topics.embedding once >500 topic rows exist.
11. Build the Next.js graph visualisation component consuming GET /v1/knowledge-graph.

 7.10     Out of Scope for This Phase
  Manual topic editing. Allowing students to rename, merge, or delete topics adds UI
   complexity that does not belong in Phase 1.5. Topics are auto-generated only.



                   Supabase + pgvector + PostgreSQL + Next.js + FastAPI               12
AI Scholar — Knowledge Graph Extension                              Phase 1.5 Addendum


 Cross-user topic graphs. The graph is strictly per-user. Global topic taxonomy
  (shared across users) is a Phase 5 concern.
 Real-time graph updates. The graph is rebuilt on demand (POST /v1/knowledge-graph/rebuild)
  or as a side effect of document upload. WebSocket or SSE streaming of graph diffs is
  deferred.
 Weighted prerequisite inference. Currently the LLM assigns prerequisite labels
  only if explicitly instructed. Automated prerequisite inference from learning-progress
  data belongs in Phase 2 or Phase 3.

7.11     Full Schema Reference (knowledge graph tables)

Table                    Phase    Key constraint                            Purpose
topics                   1.5      UNIQUE(user id, name)             Canonical topic nodes pe
                                                                    lable embedding
document topics          1.5      UNIQUE(document id, topic id)     Doc→Topic edges; upser
                                                                    vance score
document connections 1.5          UNIQUE(src, tgt) + ordering CHECK Doc↔Doc similarity edg
                                                                    old ≥0.50
topic connections        1.5      UNIQUE(user, src, tgt)            Topic↔Topic prerequisite
                                                                    edges




                Supabase + pgvector + PostgreSQL + Next.js + FastAPI                 13
AI Scholar — Knowledge Graph Extension                             Phase 1.5 Addendum



C       Appendix C — Endpoint-to-Schema Field Parity
        (Knowledge Graph)
C.1      C.1 /v1/knowledge-graph node fields

JSON field               DB column                 Type       Notes
— Document nodes —
id                       documents.id              UUID
                                                     read-only
type                     —                         literal
                                                     always "document"
label                    documents.title           string
                                                     falls        back             to
                                                     original file name
subject             topics.subject area   string     derived from majority topic
metadata.pages      documents.total pages int        read-only
metadata.status     documents.status      enum       same 5-value set as §5.2.2
metadata.quiz score quiz attempts.score   float/null avg of attempts; null if none
— Topic nodes —
id                       topics.id                 UUID       read-only
type                     —                         literal    always "topic"
label                    topics.name               string     read-only; auto-generated
subject                  topics.subject area       string     one of the 5 valid values
metadata.doc count       derived                   integer    count of document topics
                                                              rows


C.2      C.2 /v1/knowledge-graph edge fields

JSON field    DB column                                            Type   Notes
source        FK column (varies by edge type)               UUID from node
target        FK column (varies by edge type)               UUID to node
type          connection type / relationship                enum covers,               simi
                                                                  prerequisite, related
strength      relevance score / similarity score / strength float always in [0, 1]; enforce
                                                                  CHECK in all three table




                  Supabase + pgvector + PostgreSQL + Next.js + FastAPI             14

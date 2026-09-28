# UrbanPulse Architecture

```text
External Data Sources
        |
        v
   Ingestion Layer
        |
        v
    Raw Data Zone
        |
        v
 Transform / Validate
        |
        v
 PostgreSQL / Warehouse
      /         \
     v           v
 Analytics     ML Features
 Dashboard     Model Training
      \          /
       v        v
        FastAPI
           |
           v
   Next.js Dashboard
```

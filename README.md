<div align="center">
    <h1>
        <b>FineTuneForge</b>
    </h1>
</div>

FineTuneForge is a tool designed specifically for generating JSON Lines (JSONL) to facilitate the fine-tuning of AI language models like Google's PaLM 2 and OpenAI's GPT-3.5. It enables developers to easily transform text data into a JSONL format that machines can read.

![Screenshot FineTuneForge Webapp](./Screenshot%20FineTuneForge%20Webapp.png)

## Getting Started

> [!WARNING]
>
> DO NOT USE IN PRODUCTION
>
> This project has no CSRF protection. I'm unsure if i will implement it. For example, i created a new CSRF protection in Angular SSR 18. See it [here](https://github.com/ryhkml/angular-double-csrf-protection)

To get started with FineTuneForge, follow these steps:

### Installation

```sh
git clone https://github.com/ryhkml/fine-tune-forge.git
cd fine-tune-forge
./install.sh
```

### Usage

Run the JSONL generator with the following command:

```sh
npm run build
```

Serve server

```sh
npm run serve
```

Or using docker/podman compose

```sh
docker compose -p ftf --env-file .env up -d --build
```

### Update

After performing a git pull, just run the following command:

```sh
./update.sh
```

## Directory Structure

FineTuneForge is organized into several directories, each serving a specific purpose in the workflow of the JSONL generator. Below is an overview of these directories and their intended use:

- `DATADOC_OCR`: This directory acts as a temporary storage for OCR (Optical Character Recognition) images
- `DATASET`: The `DATASET` directory is the designated location for storing the completed dataset files. Once the JSONL files have been generated and are ready for use in fine-tuning the language models, they are placed in this directory
- `DATATMP`: This directory for temporary storage of instruction content
- `tls`: This directory is reserved for storing SSL/TLS certificates

## Configuring SSL/TLS for HTTPS

To enable HTTPS in the application, you need to configure SSL/TLS certificates correctly.

### Required Files

Before you start, ensure you have the following files placed in the `tls` directory:

- `fullchain.pem`: This is your certificate file that contains the full chain of trust, including any intermediate certificates along with your own
- `cert-key.pem`: This file contains your private key and must be kept secure. It is used to establish the encrypted connection
- `ca.crt` (optional): This Certificate Authority (CA) file is used if you need to specify an external CA

If you use docker, uncomment the environment variable `PROTOCOL_SERVER` in `docker-compose.yaml`

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

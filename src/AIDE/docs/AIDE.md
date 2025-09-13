# aide-llm-api-v2

API and underlying infrastructure to interact with large language models.

## Usage

### Prerequisites

One of the following use case approval paths is complete:

* [Access Request for EEUC](https://ai-de.sfgitlab.opr.statefarm.org/docs/ai-de-cookbook/%20GenAI%20Use%20Case%20Guide/Approved%20Use%20Case%20Guides/API%20Access/API_Access_EEUC/)
* [Access Request for PCAF (Business Use Case)](https://ai-de.sfgitlab.opr.statefarm.org/docs/ai-de-cookbook/%20GenAI%20Use%20Case%20Guide/Approved%20Use%20Case%20Guides/API%20Access/API%20Access%20Request/)

### API Usage

Given the prerequisites above are fulfilled, the API can be invoked in multiple ways:

* [**statefarm-aide-llm-sdk**](https://sfgitlab.opr.statefarm.org/genai/sdks/statefarm-aide-llm-sdk): provides a high-level client and utility functions to streamline requests and manage authentication _(currently Python only)_
  * See [`README`](https://sfgitlab.opr.statefarm.org/genai/sdks/statefarm-aide-llm-sdk/-/blob/main/README.md?ref_type=heads) for details and examples
* **HTTPS Request**: bring your own client and authentication _(details below)_
  * See [sample client](notebooks/llm_api_client.ipynb) for example interactions with the API.

#### Request Attributes

* API URL:
  * Production: `https://aide-llm-api-prod-aide-llm-api.apps.pcrosa01.redk8s.ic1.statefarm`
  * Test QA: `https://aide-llm-api-qa-aide-llm-api-qa.apps.pcrosa01.redk8s.test.ic1.statefarm`
* API Resources:
  * `POST /generate`
  * `POST /feedback`
* Headers:
  * `Content-Type`: `"application/json"`
  * `UseCaseID`: `"RITM*******"` or `"BUSN*******"`. See [cookbook](https://ai-de.sfgitlab.opr.statefarm.org/docs/ai-de-cookbook/%20GenAI%20Use%20Case%20Guide/Approved%20Use%20Case%20Guides/API%20Access/use_case_id/) to locate the `UseCaseID`.
    * **NOTE**: 'BUSN' will need to be added to the front of the AISE Use Case ID.
  * `Authorization`: `"Bearer <<token>>"`, where `<<token>>` is acquired from Azure.  See [cookbook](https://ai-de.sfgitlab.opr.statefarm.org/docs/ai-de-cookbook/%20GenAI%20Use%20Case%20Guide/Approved%20Use%20Case%20Guides/API%20Access/API_Access_EEUC/) for setup and [sample client](notebooks/llm_api_client.ipynb) for example.

#### `/generate`

Interact with an LLM via GaaS API.  See GaaS documentation for [supported models](https://data-platform-engineering.sfgitlab.opr.statefarm.org/docs/Capabilities/AIML/GenerativeAI/GaaS/References/supported-models/) and [usage examples](https://data-platform-engineering.sfgitlab.opr.statefarm.org/docs/Capabilities/AIML/GenerativeAI/GaaS/Guides/rest-api/usage-examples/).

##### Request

JSON object with the following attributes:

* `aide` (`dict`): AIDE-specific configurations
  * `apply_guardrail` (`str`): if set to `False`, Guardrail will be bypassed (defaults to `True`)
  * `scrub_input` (`str`): if set to `False`, sensitive data scrub will be bypassed (defaults to `True`)
  * `fail_on_scrub` (`str`): if test to `False` and SDM scrubs data from the prompt, the scrubbed prompt is passed to the model (defaults to `False`)
    * _Default behavior means that the request will fail if SDM identifies sensitive data in the prompt and scrubs it.  Users must understand that overriding this default means that a modified prompt could be sent to the LLM_
* `gaas` (`dict`): GaaS-specific configurations
  * _Refer to [GaaS API usage examples](https://data-platform-engineering.sfgitlab.opr.statefarm.org/docs/Capabilities/AIML/GenerativeAI/GaaS/Guides/rest-api/usage-examples/) for schema and examples_
* `aws` or `azure` (`dict`): Model invocation config. `aws` for Bedrock, `azure` for OpenAI
  * _Refer to [GaaS API usage examples](https://data-platform-engineering.sfgitlab.opr.statefarm.org/docs/Capabilities/AIML/GenerativeAI/GaaS/Guides/rest-api/usage-examples/) for schema and examples_
  * _Refer to [AWS Bedrock documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html) for provider-specific schemas_

```py
{
    "aide": {
        "options": dict
    },
    "gaas": dict
    "aws": dict  # or "azure" for OpenAI
}
```

##### Response

JSON object with the following attributes:

* `aide` (`dict`): AIDE-specific response information
  * `request_id` (`str`): lambda execution requestId
  * `filters` (`dict`): details on the various filters applied to the documents
    * for each filter (currently `scrub`, `guardrail`, and/or `openai`):
      * `executed` (`bool`): whether or not the filter was executed
      * `violation` (`bool`): whether or not the filter was violated
      * `details` (`dict`): available details on any violation that occurred (varies by filter)
* `gaas` (`dict`): GaaS-specific response information
  * _Refer to [GaaS API usage examples](https://data-platform-engineering.sfgitlab.opr.statefarm.org/docs/Capabilities/AIML/GenerativeAI/GaaS/Guides/rest-api/usage-examples/) for schema and examples_
* `aws` or `azure` (`dict`): Model response. `aws` for Bedrock, `azure` for OpenAI
  * _Refer to [GaaS API usage examples](https://data-platform-engineering.sfgitlab.opr.statefarm.org/docs/Capabilities/AIML/GenerativeAI/GaaS/Guides/rest-api/usage-examples/) for schema and examples_
  * _Refer to [AWS Bedrock documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters.html) for provider-specific schemas_

```py
{
    "aide": {
        "request_id": str,
        "filters": dict
    },
    "gaas": dict
    "aws": dict  # or "azure" for OpenAI
}
```

##### Examples

**Claude 3.7 Sonnet**

<details>
<summary>Request</summary>

```json
{
  "aide": {
    "scrub_input": true,
    "apply_guardrail": true,
    "fail_on_scrub": true
  },
  "gaas": {
    "guardrailsEnabled": false, // Ignore this GaaS field - use AIDE configuration instead
    "scrubInput": false, // Ignore this GaaS field - use AIDE configuration instead
    "scrubbingTimeoutSeconds": 8, // Ignore this GaaS field - use AIDE configuration instead
    "pathToPrompt": "aws.bedrock.invoke.body.messages[*].content[*].text",
    "logMetadata":{
            "solmaId": "123456"
    }
  },
  "aws": {
    "bedrock": {
      "invoke": {
        "modelId": "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
        "body": {
          "anthropic_version": "bedrock-2023-05-31",
          "max_tokens": 1024,
          "messages": [
            {
              "role": "user",
              "content": [{"type": "text", "text": "What is the capital of France?"}]
            }
          ]
        }
      }
    }
  }
}
```

</details>

<details>
<summary>Response</summary>

```json
{
  "aide": {
    "request_id": "e5eb9d8e-b324-40d8-8a72-952161f7464c",
    "filters": {
      "scrub": {
        "executed": true,
        "violation": false,
        "details": {
          "scrubbed": []
        }
      },
      "guardrail": {
        "executed": true,
        "violation": false,
        "details": {}
      }
    }
  },
  "gaas": {
    "scrubbingRuleViolation": false
  },
  "aws": {
    "id": "msg_bdrk_01QKSbwce59x3my4L4cbRxG6",
    "type": "message",
    "role": "assistant",
    "model": "claude-3-7-sonnet-20250219",
    "content": [
      {
        "type": "text",
        "text": "The capital of France is Paris."
      }
    ],
    "stop_reason": "end_turn",
    "stop_sequence": null,
    "usage": {
      "input_tokens": 25,
      "cache_creation_input_tokens": 0,
      "cache_read_input_tokens": 0,
      "output_tokens": 12
    },
    "amazon-bedrock-guardrailAction": "NONE"
  }
}
```

</details>

**GPT 4o**

<details>
<summary>Request</summary>

```json
{
  "aide": {
    "scrub_input": true,
    "apply_guardrail": true,
    "fail_on_scrub": true
  },
  "gaas": {
    "guardrailsEnabled": false, // Ignore this GaaS field - use AIDE configuration instead
    "scrubInput": false, // Ignore this GaaS field - use AIDE configuration instead
    "scrubbingTimeoutSeconds": 8, // Ignore this GaaS field - use AIDE configuration instead
    "pathToPrompt": "azure.openai.chatCompletions.create.messages[*].content",
    "logMetadata":{
            "solmaId": "123456"
    }    
  },
  "azure": {
    "openai": {
      "apiVersion": "2024-10-21",
      "chatCompletions": {
        "create": {
          "model": "gpt-4o",
          "messages": [
            {
              "role": "user",
              "content": "Campany ABC makes toys and clothes for kids."
            },
            {
              "role": "user",
              "content": "What does company ABC make?"
            }
          ]
        }
      }
    }
  }
}
```

</details>

<details>
<summary>Response</summary>

```json
{
  "aide": {
    "request_id": "85e94fcc-bfaf-4669-b583-b7b93938f27c",
    "filters": {
      "scrub": {
        "executed": true,
        "violation": false,
        "details": {
          "scrubbed": []
        }
      },
      "guardrail": {
        "executed": true,
        "violation": false,
        "details": {}
      }
    }
  },
  "gaas": {
    "scrubbingRuleViolation": false
  },
  "azure": {
    "id": "chatcmpl-Boc31poFfnDMdLpB5Vuv0v1r8FuAC",
    "choices": [
      {
        "finish_reason": "stop",
        "index": 0,
        "logprobs": null,
        "message": {
          "content": "Company ABC makes toys and clothes for kids.",
          "refusal": null,
          "role": "assistant",
          "annotations": []
        },
        "content_filter_results": {
          "hate": {
            "filtered": false,
            "severity": "safe"
          },
          "self_harm": {
            "filtered": false,
            "severity": "safe"
          },
          "sexual": {
            "filtered": false,
            "severity": "safe"
          },
          "violence": {
            "filtered": false,
            "severity": "safe"
          }
        }
      }
    ],
    "created": 1751402355,
    "model": "gpt-4o-2024-08-06",
    "object": "chat.completion",
    "system_fingerprint": "fp_ee1d74bde0",
    "usage": {
      "completion_tokens": 10,
      "prompt_tokens": 27,
      "total_tokens": 37,
      "completion_tokens_details": {
        "accepted_prediction_tokens": 0,
        "audio_tokens": 0,
        "reasoning_tokens": 0,
        "rejected_prediction_tokens": 0
      },
      "prompt_tokens_details": {
        "audio_tokens": 0,
        "cached_tokens": 0
      }
    },
    "prompt_filter_results": [
      {
        "prompt_index": 0,
        "content_filter_results": {
          "hate": {
            "filtered": false,
            "severity": "safe"
          },
          "self_harm": {
            "filtered": false,
            "severity": "safe"
          },
          "sexual": {
            "filtered": false,
            "severity": "safe"
          },
          "violence": {
            "filtered": false,
            "severity": "safe"
          }
        }
      }
    ]
  }
}
```

</details>

#### `/feedback`

##### Request

JSON object with the following attributes:

* `request_id` (`str`): Request Id of your responding feedback on request
* `use_case`  (`string`): Enter your use case name
* `auth_token`(`string`): Enter Azure auth token
* Optional parameters:
  * `thumpbsup` (`boolean`): If you like it then pass True else False
  * `comments`  (`string`): Enter your comments

```
{
   request_id,
    True, #Thumbsup
    "I liked it, testing",
    use_case="ai-de-gitlab-bots",
    auth_token=auth_token,
}
```

##### Response

Data Inserted successfully!

#### Error Response Body

* `request_id` (`str`): executed requestId
* `error` (`str`): error message with details

```
{
    "request_id": str,
    "error": str
}
```

##### Example

<details>
<summary>Request</summary>

```json
{        
"request_id": "7ac7d162-e7aa-4749-af7c-051ab12caa52",
"thumbsup": true,
"feedback_response": "I liked it",
"new_column": "test"
}
```

</details>

<details>
<summary>Response</summary

```json
{
"message": "data inserted successfully for request_id: 7ac7d162-e7aa-4749-af7c-051ab12caa52"
}
```

</details>

## Troubleshooting

If the API encounters an error, it will return a `statusCode` besides 200 and an `error` containing the message.  See the `log_and_raise_error` function in the [sample notebook](notebooks/llm_api_client.ipynb) for an example of handling an error message.

If unable to correct the error by adjusting your request, open a [Service Request](https://sfgitlab.opr.statefarm.org/ai-de/service-requests/-/issues) and the AI-DE team will assist you.

## Setup

For instructions to set this project up on your workstation, see [Terraform Infrastructure with Lambdas Project Setup Guide](https://ai-de.sfgitlab.opr.statefarm.org/docs/ai-de-wiki/Procedures/AI-DE%20Workflow/Step%202%20-%20Project%20Setup/Terraform%20Infrastructure%20with%20Lambdas/#prerequisitesassumptions).

## Contributing

For instructions to contribute to this project, see [Terraform Infrastructure with Lambdas Project Contributions Guide](https://ai-de.sfgitlab.opr.statefarm.org/docs/ai-de-wiki/Procedures/AI-DE%20Workflow/Step%203%20-%20Project%20Contributions/Terraform%20Infrastructure%20with%20Lambdas/).

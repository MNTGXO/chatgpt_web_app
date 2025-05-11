// api/chat.go
package api

import (
  "bytes"
  "encoding/json"
  "io"
  "net/http"
)

type ChatRequest struct {
  Prompt string `json:"prompt"`
}
type APIMessage struct {
  Role, Content string `json:"role" json:"content"`
}
type APIRequest struct {
  Messages []APIMessage `json:"messages"`
  Stream   bool         `json:"stream"`
}
type APIChoice struct {
  Message APIMessage `json:"message"`
}
type APIResponse struct {
  Choices []APIChoice `json:"choices"`
}

// Handler is the entrypoint for Vercel’s Go serverless function
func Handler(w http.ResponseWriter, r *http.Request) {
  if r.Method != http.MethodPost {
    http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
    return
  }

  var req ChatRequest
  if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Prompt == "" {
    http.Error(w, "Invalid request payload", http.StatusBadRequest)
    return
  }

  apiReq := APIRequest{
    Messages: []APIMessage{{Role: "user", Content: req.Prompt}},
    Stream:   false,
  }
  body, _ := json.Marshal(apiReq)

  resp, err := http.Post("https://mnbots-api.vercel.app/chat",
    "application/json", bytes.NewReader(body))
  if err != nil {
    http.Error(w, "Failed to reach API", http.StatusInternalServerError)
    return
  }
  defer resp.Body.Close()

  if resp.StatusCode != http.StatusOK {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(resp.StatusCode)
    json.NewEncoder(w).Encode(map[string]string{"error": resp.Status})
    return
  }

  var apiResp APIResponse
  if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
    http.Error(w, "Invalid API response", http.StatusInternalServerError)
    return
  }

  out := map[string]string{"response": apiResp.Choices[0].Message.Content}
  w.Header().Set("Content-Type", "application/json")
  json.NewEncoder(w).Encode(out)
}

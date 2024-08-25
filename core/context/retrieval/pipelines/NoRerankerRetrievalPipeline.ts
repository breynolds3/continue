import { Chunk } from "../../../index.js";
import { deduplicateChunks } from "../util.js";
import BaseRetrievalPipeline from "./BaseRetrievalPipeline.js";

export default class NoRerankerRetrievalPipeline extends BaseRetrievalPipeline {
  async run(): Promise<Chunk[]> {
    const { input, nFinal } = this.options;

    // We give 1/4 weight to recently edited files, 1/4 to full text search,
    // and the remaining 1/2 to embeddings
    const recentlyEditedNFinal = nFinal * 0.25;
    
    const embeddingsNFinal = nFinal - recentlyEditedNFinal - nFinal * 0.25;
    const retrievalResults: Chunk[] = [];

    const embeddingsChunks = await this.retrieveEmbeddings(
      input,
      embeddingsNFinal,
    );

    const recentlyEditedFilesChunks =
      await this.retrieveAndChunkRecentlyEditedFiles(recentlyEditedNFinal);

    // use the remainder for freetext search
    const ftsNFinal = nFinal - embeddingsChunks.length - recentlyEditedFilesChunks.length;
    const ftsChunks = await this.retrieveFts(input, ftsNFinal);

    console.log("ftsChunks", ftsChunks);
    console.log("embeddingsChunks", embeddingsChunks);
    console.log("recentlyEditedFilesChunks", recentlyEditedFilesChunks);
    retrievalResults.push(
      ...recentlyEditedFilesChunks,
      ...ftsChunks,
      ...embeddingsChunks,
    );

    const deduplicatedRetrievalResults: Chunk[] =
      deduplicateChunks(retrievalResults);

    return deduplicatedRetrievalResults;
  }
}

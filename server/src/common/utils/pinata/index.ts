import { PinataSDK } from "pinata";
import { ENVIRONMENT } from "../../../common/config/environment.js";

// File constructor polyfill for Node.js environments
if (typeof File === 'undefined') {
  global.File = class File {
    private _buffer: Buffer;

    constructor(buffer: Buffer | ArrayBuffer | ArrayBufferView, name: string, options: { type?: string; lastModified?: number } = {}) {
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
      this.size = buffer instanceof Buffer ? buffer.length : buffer.byteLength;
      this.type = options.type || '';
      
      // Convert to Buffer safely
      if (buffer instanceof Buffer) {
        this._buffer = buffer;
      } else if (buffer instanceof ArrayBuffer) {
        this._buffer = Buffer.from(buffer);
      } else {
        this._buffer = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      }
    }

    name: string;
    lastModified: number;
    size: number;
    type: string;

    async arrayBuffer(): Promise<ArrayBuffer> {
      const buffer = this._buffer.buffer.slice(this._buffer.byteOffset, this._buffer.byteOffset + this._buffer.byteLength);
      return buffer as ArrayBuffer;
    }

    async text(): Promise<string> {
      return this._buffer.toString();
    }

    stream(): ReadableStream {
      const buffer = this._buffer;
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(buffer);
          controller.close();
        }
      });
      return readable;
    }
  } as any;
}

export class PinataUtils {
  private pinata: PinataSDK;

  constructor() {
    if (!ENVIRONMENT.PINATA.JWT) {
      throw new Error("PINATA_JWT is required for Pinata operations");
    }
    if (!ENVIRONMENT.PINATA.GATEWAY_URL) {
      throw new Error("PINATA_GATEWAY_URL is required for Pinata operations");
    }

    this.pinata = new PinataSDK({
      pinataJwt: ENVIRONMENT.PINATA.JWT,
      pinataGateway: ENVIRONMENT.PINATA.GATEWAY_URL,
    });
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    try {
      console.log(`Uploading image to Pinata: ${file.originalname}`);

      // Create a Blob from the file buffer
      const blob = new Blob([file.buffer], { type: file.mimetype });

      // Create a File object from the Blob
      const fileObject = new File([blob], file.originalname, {
        type: file.mimetype,
      });

      // Upload to Pinata
      const upload = await this.pinata.upload.public.file(fileObject);

      console.log("Image uploaded to Pinata successfully:", {
        cid: upload.cid,
        name: upload.name,
        size: upload.size,
        mimeType: upload.mime_type,
      });

      return upload.cid;
    } catch (error) {
      console.error("Error uploading image to Pinata:", error);
      throw new Error(
        `Failed to upload image to Pinata: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async uploadMetadata(metadata: any): Promise<string> {
    try {
      console.log("Uploading metadata to Pinata...");

      // Upload JSON metadata to Pinata
      const upload = await this.pinata.upload.public.json(metadata);

      console.log("Metadata uploaded to Pinata successfully:", {
        cid: upload.cid,
        name: upload.name,
        size: upload.size,
      });

      return upload.cid;
    } catch (error) {
      console.error("Error uploading metadata to Pinata:", error);
      throw new Error(
        `Failed to upload metadata to Pinata: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async uploadImageFromUrl(
    imageUrl: string,
    filename?: string
  ): Promise<string> {
    try {
      console.log(`Downloading image from URL: ${imageUrl}`);

      // Download the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to download image: ${response.status} ${response.statusText}`
        );
      }

      // Get the image as an array buffer
      const arrayBuffer = await response.arrayBuffer();

      // Determine filename and content type
      const urlFilename =
        filename || imageUrl.split("/").pop() || "mission-image.jpg";
      const contentType = response.headers.get("content-type") || "image/jpeg";

      console.log(
        `Image downloaded: ${urlFilename}, size: ${arrayBuffer.byteLength} bytes, type: ${contentType}`
      );

      // Create a Blob from the array buffer
      const blob = new Blob([arrayBuffer], { type: contentType });

      // Create a File object from the Blob
      const fileObject = new File([blob], urlFilename, { type: contentType });

      // Upload to Pinata
      const upload = await this.pinata.upload.public.file(fileObject);

      console.log("Image uploaded to Pinata from URL successfully:", {
        cid: upload.cid,
        name: upload.name,
        size: upload.size,
        mimeType: upload.mime_type,
      });

      return upload.cid;
    } catch (error) {
      console.error("Error uploading image from URL to Pinata:", error);
      throw new Error(
        `Failed to upload image from URL to Pinata: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async uploadImageBuffer(
    imageBuffer: Buffer,
    filename: string,
    contentType: string = "image/jpeg"
  ): Promise<string> {
    try {
      console.log(`Uploading image buffer to Pinata: ${filename}`);

      // Create a Blob from the buffer
      const blob = new Blob([imageBuffer], { type: contentType });

      // Create a File object from the Blob
      const fileObject = new File([blob], filename, { type: contentType });

      // Upload to Pinata
      const upload = await this.pinata.upload.public.file(fileObject);

      console.log("Image buffer uploaded to Pinata successfully:", {
        cid: upload.cid,
        name: upload.name,
        size: upload.size,
        mimeType: upload.mime_type,
      });

      return upload.cid;
    } catch (error) {
      console.error("Error uploading image buffer to Pinata:", error);
      throw new Error(
        `Failed to upload image buffer to Pinata: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getFileFromGateway(cid: string): Promise<any> {
    try {
      console.log(`Fetching file from Pinata gateway: ${cid}`);

      const file = await this.pinata.gateways.public.get(cid);

      console.log("File fetched from gateway successfully:", {
        cid,
        size: typeof file.data === "string" ? file.data.length : "unknown",
      });

      return file;
    } catch (error) {
      console.error("Error fetching file from Pinata gateway:", error);
      throw new Error(
        `Failed to fetch file from Pinata gateway: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getFileMetadata(cid: string): Promise<any> {
    try {
      console.log(`Fetching file metadata from Pinata: ${cid}`);

      // Note: The SDK might not have a direct metadata endpoint
      // You might need to use the gateway to get the file and extract metadata
      const file = await this.pinata.gateways.public.get(cid);

      return {
        cid,
        size: typeof file.data === "string" ? file.data.length : "unknown",
        // Add other metadata as available
      };
    } catch (error) {
      console.error("Error fetching file metadata from Pinata:", error);
      throw new Error(
        `Failed to fetch file metadata from Pinata: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate the IPFS URI for NFT metadata
   * @param cid The IPFS CID of the metadata
   * @returns The IPFS URI (ipfs://{cid})
   */
  generateMetadataURI(cid: string): string {
    return `ipfs://${cid}`;
  }

  /**
   * Generate the HTTP gateway URL for NFT metadata
   * @param cid The IPFS CID of the metadata
   * @returns The HTTP gateway URL
   */
  generateGatewayURL(cid: string): string {
    return `${ENVIRONMENT.PINATA.GATEWAY_URL}/ipfs/${cid}`;
  }

  /**
   * Generate the token URI that should be returned by the smart contract
   * @param cid The IPFS CID of the metadata
   * @returns The IPFS URI for the smart contract
   */
  generateTokenURI(cid: string): string {
    return this.generateMetadataURI(cid);
  }
}

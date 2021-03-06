import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
	id("org.springframework.boot") version "2.2.5.RELEASE"
	id("io.spring.dependency-management") version "1.0.9.RELEASE"
	kotlin("jvm") version "1.3.61"
	kotlin("plugin.spring") version "1.3.61"
}

group = "com.valuedriven"
version = "0.0.1-SNAPSHOT"
java.sourceCompatibility = JavaVersion.VERSION_11

repositories {
	mavenCentral()
}

dependencies {
	implementation("org.springframework.boot:spring-boot-starter-actuator")
	implementation("org.springframework.boot:spring-boot-starter-websocket")
	implementation("org.springframework.boot:spring-boot-starter-security")
	implementation("org.springframework.security:spring-security-messaging")
	implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
	implementation("org.jetbrains.kotlin:kotlin-reflect")
	implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8")
	testImplementation("org.springframework.boot:spring-boot-starter-test") {
		exclude(group = "org.junit.vintage", module = "junit-vintage-engine")
	}
	testCompile("org.assertj:assertj-core:3.11.1")
}

tasks.withType<Test> {
	useJUnitPlatform()
}

tasks.withType<KotlinCompile> {
	kotlinOptions {
		freeCompilerArgs = listOf("-Xjsr305=strict")
		jvmTarget = "1.8"
	}
}

tasks.register<Copy>("copyFrontendFiles") {
	from("../frontend/build")
	into("${buildDir}/resources/main/static/")
	dependsOn(":frontend:yarn_build")
}

tasks.named("bootJar") {
	dependsOn("copyFrontendFiles")
}

val dockerBuild = "${buildDir}/docker"

tasks.register<Copy>("copyJar") {
	from("${buildDir}/libs")
	into(dockerBuild)
	dependsOn("bootJar")
}

tasks.register<Copy>("copyDockerFile") {
	from("src/main/docker")
	into(dockerBuild)
}

tasks.register<Exec>("docker") {
	workingDir(dockerBuild)
	commandLine("docker", "build", ".", "-t", "com.valuedriven/6nimmt")
	dependsOn("copyJar", "copyDockerFile")
}